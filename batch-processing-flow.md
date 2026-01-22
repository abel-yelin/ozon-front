# 批量图片生成流程详解

## 📦 前端发送的数据结构

### 批量任务payload示例：

```json
{
  "job_id": "xxx-xxx-xxx",
  "user_id": "user-123",
  "mode": "batch_series_generate",
  "sku": "__batch__",
  "stem": null,
  "options": {
    "skus": ["SKU1", "SKU2", "SKU3"],

    "sku_images_map": {
      "SKU1": [
        {"url": "https://cdn.../img1.jpg", "name": "img1.jpg", "stem": "stem1"},
        {"url": "https://cdn.../img2.jpg", "name": "img2.jpg", "stem": "stem2"},
        {"url": "https://cdn.../img3.jpg", "name": "img3.jpg", "stem": "stem3"}
      ],
      "SKU2": [
        {"url": "https://cdn.../img4.jpg", "name": "img4.jpg", "stem": "stem4"}
      ],
      "SKU3": [
        {"url": "https://cdn.../img5.jpg", "name": "img5.jpg", "stem": "stem5"}
      ]
    },

    "settings": {
      "imageSize": "1536x1536",
      "imageFormat": "png",
      "quality": 90
    },

    // AI配置
    "api_key": "sk-xxx",
    "api_base": "https://api.openai.com/v1",
    "model": "gpt-4-vision-preview",
    "target_width": 1536,
    "target_height": 1536,
    "output_format": "png",
    "use_english": false,
    "prompt_templates": {
      "common_cn": "根据图片内容生成...",
      "main_cn": "主图...",
      "opt_remove_watermark_cn": "去除水印..."
    }
  }
}
```

**关键点**：
- `sku_images_map` 包含了所有图片的完整URL
- SKU1有3张图片，SKU2有1张，SKU3有1张
- 总共5张图片需要处理

---

## 🔄 FastAPI后端的处理逻辑

### 理论上，FastAPI有以下几种实现方式：

### 方案A: 完全并发（并行处理所有图片）
```python
# 伪代码
async def process_batch(job):
    tasks = []
    for sku, images in sku_images_map.items():
        for image in images:
            # 每张图片独立创建AI任务
            task = generate_image(image, prompt_templates)
            tasks.append(task)

    # 所有任务并行执行
    results = await asyncio.gather(*tasks)
    return results
```

**优点**: 速度最快
**缺点**:
- 并发数太高（如果有100张图片 = 100个并发请求）
- 可能触发AI API速率限制
- 服务器资源消耗大

### 方案B: 批量并发（分组并行）
```python
# 伪代码
async def process_batch(job):
    BATCH_SIZE = 5  # 每次处理5张

    all_images = flatten(sku_images_map)
    results = []

    for i in range(0, len(all_images), BATCH_SIZE):
        batch = all_images[i:i+BATCH_SIZE]
        tasks = [generate_image(img) for img in batch]

        batch_results = await asyncio.gather(*tasks)
        results.extend(batch_results)

    return results
```

**优点**:
- 控制并发数
- 平衡速度和资源

**缺点**:
- 需要合理设置BATCH_SIZE

### 方案C: 串行处理（依次完成每张）
```python
# 伪代码
async def process_batch(job):
    all_images = flatten(sku_images_map)
    results = []

    for image in all_images:
        result = await generate_image(image)
        results.append(result)

    return results
```

**优点**:
- 最稳定
- 不会触发API限制

**缺点**:
- 速度最慢（100张图片 = 100倍时间）

### 方案D: 混合并发（SKU级并发）
```python
# 伪代码
async def process_batch(job):
    tasks = []

    # 每个SKU作为一个批次
    for sku, images in sku_images_map.items():
        # SKU内的图片串行，SKU之间并行
        task = process_sku_images(sku, images)
        tasks.append(task)

    results = await asyncio.gather(*tasks)
    return results

async def process_sku_images(sku, images):
    sku_results = []
    for image in images:
        result = await generate_image(image)
        sku_results.append(result)
    return sku_results
```

---

## 🔍 如何判断你的系统使用哪种方案？

### 方法1: 检查FastAPI后端代码
查找关键词：
```python
# 文件路径类似: backend/api/v1/image_studio/jobs.py

async def batch_series_generate_handler(payload):
    # 检查这里有没有：
    # 1. asyncio.gather() -> 并发
    # 2. for loop -> 串行
    # 3. Semaphore/BATCH_SIZE -> 批量并发
```

### 方法2: 实际测试观察
```
1. 启动一个3张图片的批量任务
2. 观察AI API的调用时间线：

   如果是并发：
   t=0s:  图片1开始生成
   t=0s:  图片2开始生成
   t=0s:  图片3开始生成
   t=30s: 三张同时完成

   如果是串行：
   t=0s:  图片1开始生成
   t=30s: 图片1完成，图片2开始
   t=60s: 图片2完成，图片3开始
   t=90s: 图片3完成
```

### 方法3: 查看数据库job进度
```sql
-- 查看job的result_image_urls增长情况
SELECT
    id,
    status,
    array_length(result_image_urls, 1) as completed_count,
    created_at,
    updated_at
FROM ai_job
WHERE type = 'image_studio'
ORDER BY created_at DESC
LIMIT 1;

-- 每隔几秒查询一次
-- 如果completed_count快速增长 -> 并发
-- 如果completed_count每30秒增加1 -> 串行
```

---

## 🎯 推荐的实现方式

基于你的使用场景（电商图片批量处理），我推荐：

### **方案E: 智能队列（最佳实践）**

```python
# 后端实现
async def process_batch(job):
    # 1. 将所有图片加入队列
    queue = create_job_queue(job.id, sku_images_map)

    # 2. 启动多个worker处理
    workers = []
    for i in range(MAX_WORKERS):  # 比如3个worker
        worker = asyncio.create_task(process_queue_worker(queue))
        workers.append(worker)

    # 3. 等待所有worker完成
    await asyncio.gather(*workers)

    # 4. 收集结果
    results = get_job_results(job.id)
    return results

async def process_queue_worker(queue):
    while True:
        image = await queue.get()
        if image is None:  # 结束信号
            break

        try:
            result = await generate_image(image)
            await save_result(image.id, result)
        except Exception as e:
            await save_error(image.id, e)

        queue.task_done()
```

**优点**:
- ✅ 控制并发数（MAX_WORKERS）
- ✅ 失败自动重试
- ✅ 进度可追踪
- ✅ 资源消耗可控

---

## 📊 当前你的系统可能是哪种？

基于你提到的"后端产生了两条记录"，我怀疑：

1. **可能是串行处理**
   - FastAPI收到第一个job
   - 开始处理第一张图
   - 处理失败/超时
   - 前端重试，创建了第二个job

2. **或者是并发但有限制**
   - FastAPI同时处理多张
   - 但某个环节（如AI API）有速率限制
   - 导致部分失败

---

## 💡 建议

要确定你的系统是哪种实现，你需要：

### 1. 查看FastAPI源码
查找文件:
```bash
find backend -name "*.py" -type f | xargs grep -l "batch_series_generate"
```

### 2. 查看FastAPI日志
运行批量任务时，观察：
```python
# 查找类似这样的日志
logger.info(f"Processing image {i+1}/{total}")
# 或
logger.info(f"Starting concurrent processing of {len(images)} images")
```

### 3. 监控数据库
```sql
-- 实时监控job进度
SELECT
    jsonb_array_length(result_image_urls) as completed,
    (SELECT COUNT(*) FROM jsonb_each_text(config->'options'->'sku_images_map')) as total,
    created_at,
    updated_at
FROM ai_job
WHERE id = 'your-job-id'
```

---

## ❓ 你的具体问题

**"同一个job下的是并发AI生图，还是完成第一张，然后依次完成呢？"**

**答案取决于你的FastAPI后端实现！**

前端只负责：
1. ✅ 收集所有图片URL
2. ✅ 组装payload
3. ✅ 发送给FastAPI
4. ✅ 等待结果

后端（FastAPI）负责：
1. ❓ 如何拆分任务
2. ❓ 如何调度AI API
3. ❓ 并发还是串行
4. ❓ 如何处理失败

**要搞清楚，需要查看FastAPI的源码！**

你能找到FastAPI的代码仓库吗？或者我可以帮你分析日志来推断！
