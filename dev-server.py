# 개발용 서버. 브라우저가 CSS/JS를 캐시하지 못하게 막는다.
# 캐시 때문에 "고쳤는데 안 바뀐다"는 착각을 없애려는 것이다.
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

ThreadingHTTPServer(('', 8321), NoCacheHandler).serve_forever()
