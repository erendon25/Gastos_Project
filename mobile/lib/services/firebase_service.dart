import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/transaction.dart';

class FirebaseService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  User? get currentUser => _auth.currentUser;
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  // Fetch expenses for a specific month
  Stream<List<TransactionModel>> getExpenses(DateTime month) {
    if (currentUser == null) return Stream.value([]);
    
    DateTime start = DateTime(month.year, month.month, 1);
    DateTime end = DateTime(month.year, month.month + 1, 0, 23, 59, 59);

    return _db
        .collection('users')
        .doc(currentUser!.uid)
        .collection('gastos')
        .where('date', isGreaterThanOrEqualTo: Timestamp.fromDate(start))
        .where('date', isLessThanOrEqualTo: Timestamp.fromDate(end))
        .orderBy('date', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => TransactionModel.fromFirestore(doc, 'expense'))
            .toList());
  }

  // Fetch recurring expenses
  Stream<List<TransactionModel>> getRecurringExpenses() {
    if (currentUser == null) return Stream.value([]);
    return _db
        .collection('users')
        .doc(currentUser!.uid)
        .collection('gastos_recurrentes')
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => TransactionModel.fromFirestore(doc, 'recurring'))
            .toList());
  }

  // Fetch debts
  Stream<List<DebtModel>> getDebts() {
    if (currentUser == null) return Stream.value([]);
    return _db
        .collection('users')
        .doc(currentUser!.uid)
        .collection('prestamos')
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => DebtModel.fromFirestore(doc))
            .toList());
  }

  // Fetch income
  Stream<List<TransactionModel>> getIncomes(DateTime month) {
    if (currentUser == null) return Stream.value([]);
    
    DateTime start = DateTime(month.year, month.month, 1);
    DateTime end = DateTime(month.year, month.month + 1, 0, 23, 59, 59);

    return _db
        .collection('users')
        .doc(currentUser!.uid)
        .collection('ingresos')
        .where('date', isGreaterThanOrEqualTo: Timestamp.fromDate(start))
        .where('date', isLessThanOrEqualTo: Timestamp.fromDate(end))
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => TransactionModel.fromFirestore(doc, 'income'))
            .toList());
  }

  Future<void> addExpense(Map<String, dynamic> data) async {
    if (currentUser == null) return;
    await _db
        .collection('users')
        .doc(currentUser!.uid)
        .collection('gastos')
        .add({
      ...data,
      'date': FieldValue.serverTimestamp(),
    });
  }

  Future<void> signOut() async {
    await _auth.signOut();
  }
}
