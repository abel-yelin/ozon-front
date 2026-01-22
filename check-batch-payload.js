// 检查批量任务的payload结构
const batchPayload = {
  mode: 'batch_series_generate',
  sku: '__batch__',
  stem: null,
  options: {
    skus: ['SKU1', 'SKU2', 'SKU3'],
    settings: {
      imageSize: '1536x1536',
      imageFormat: 'png',
      quality: 90,
      preserveOriginal: true
    },
    sku_images_map: {
      'SKU1': [
        {url: 'https://...', name: 'img1.jpg', stem: 'stem1'},
        {url: 'https://...', name: 'img2.jpg', stem: 'stem2'}
      ],
      'SKU2': [
        {url: 'https://...', name: 'img3.jpg', stem: 'stem3'}
      ]
    },
    // AI配置
    api_key: 'xxx',
    api_base: 'xxx',
    model: 'xxx',
    target_width: 1536,
    target_height: 1536,
    output_format: 'png',
    use_english: false,
    prompt_templates: {
      common_cn: '...',
      main_cn: '...',
      // ... 其他模板
    }
  }
};

console.log('批量任务payload结构:');
console.log('1. mode: batch_series_generate - 告诉后端这是批量模式');
console.log('2. options.skus: SKU列表 - 要处理哪些SKU');
console.log('3. options.sku_images_map: 每个SKU的图片列表');
console.log('   SKU1有2张图片，SKU2有1张图片');
console.log('4. prompt_templates: AI提示词模板');
console.log('');
console.log('问题：这些图片是并发处理还是依次处理？');
console.log('答案：这取决于FastAPI后端的实现！');
