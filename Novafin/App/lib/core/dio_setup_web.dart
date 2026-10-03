import 'package:dio/browser.dart';
import 'package:dio/dio.dart';

/// On web the browser owns cookie storage; we just need it to send/accept
/// the httpOnly session cookie on cross-origin XHR requests.
void configureDio(Dio dio) {
  dio.httpClientAdapter = BrowserHttpClientAdapter(withCredentials: true);
}
