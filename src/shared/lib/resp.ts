export function respData(data: any) {
  return respJson(0, 'ok', data || []);
}

export function respOk() {
  return respJson(0, 'ok');
}

export function respErr(message: string) {
  return respJson(-1, message);
}

export function respJson(code: number, message: string, data?: any) {
  let json = {
    code: code,
    message: message,
    success: code === 0,
    data: data,
  };
  if (data) {
    json['data'] = data;
  }

  return Response.json(json);
}
