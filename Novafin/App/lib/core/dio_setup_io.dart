import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';

/// Desktop/mobile builds talk over a raw HTTP client with no browser cookie
/// jar behind them, so dio_cookie_manager keeps the session cookie across
/// requests. On web this file is swapped for dio_setup_web.dart instead,
/// since dio_cookie_manager refuses to run there (the browser already owns
/// cookie storage).
void configureDio(Dio dio) {
  dio.interceptors.add(CookieManager(CookieJar()));
}
