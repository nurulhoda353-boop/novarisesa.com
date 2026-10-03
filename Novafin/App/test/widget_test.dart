import 'package:flutter_test/flutter_test.dart';

import 'package:novafin_app/main.dart';

void main() {
  testWidgets('Shows the sign-in screen when signed out', (WidgetTester tester) async {
    await tester.pumpWidget(const NovaFinApp());
    await tester.pumpAndSettle();

    expect(find.text('Sign in'), findsOneWidget);
  });
}
