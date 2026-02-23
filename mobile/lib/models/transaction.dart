import 'package:cloud_firestore/cloud_firestore.dart';

class TransactionModel {
  final String id;
  final double amount;
  final String description;
  final String category;
  final String? categoryEmoji;
  final DateTime date;
  final bool isRecurring;
  final bool autoDebit;
  final bool paid;
  final String type; // expense, income, recurring, debt

  TransactionModel({
    required this.id,
    required this.amount,
    required this.description,
    required this.category,
    this.categoryEmoji,
    required this.date,
    required this.isRecurring,
    required this.autoDebit,
    required this.paid,
    required this.type,
  });

  factory TransactionModel.fromFirestore(DocumentSnapshot doc, String type) {
    Map data = doc.data() as Map<String, dynamic>;
    return TransactionModel(
      id: doc.id,
      amount: (data['amount'] ?? 0).toDouble(),
      description: data['description'] ?? '',
      category: data['category'] ?? '',
      categoryEmoji: data['categoryEmoji'],
      date: (data['date'] as Timestamp?)?.toDate() ?? DateTime.now(),
      isRecurring: data['isRecurring'] ?? false,
      autoDebit: data['autoDebit'] ?? false,
      paid: data['paid'] ?? false,
      type: type,
    );
  }
}

class DebtModel extends TransactionModel {
  final DateTime? startDate;
  final DateTime? dueDate;
  final String? debtSubtype;
  final double? totalLoanAmount;
  final double? remainingAmount;
  final int? paidQuotas;

  DebtModel({
    required super.id,
    required super.amount,
    required super.description,
    required super.category,
    super.categoryEmoji,
    required super.date,
    required super.isRecurring,
    required super.autoDebit,
    required super.paid,
    required super.type,
    this.startDate,
    this.dueDate,
    this.debtSubtype,
    this.totalLoanAmount,
    this.remainingAmount,
    this.paidQuotas,
  });

  factory DebtModel.fromFirestore(DocumentSnapshot doc) {
    Map data = doc.data() as Map<String, dynamic>;
    return DebtModel(
      id: doc.id,
      amount: (data['amount'] ?? 0).toDouble(),
      description: data['description'] ?? '',
      category: data['category'] ?? '',
      categoryEmoji: data['categoryEmoji'],
      date: (data['date'] as Timestamp?)?.toDate() ?? DateTime.now(),
      isRecurring: true,
      autoDebit: data['autoDebit'] ?? false,
      paid: data['paid'] ?? false,
      type: 'debt',
      startDate: (data['startDate'] as Timestamp?)?.toDate(),
      dueDate: (data['dueDate'] as Timestamp?)?.toDate(),
      debtSubtype: data['debtSubtype'],
      totalLoanAmount: (data['totalLoanAmount'] ?? 0).toDouble(),
      remainingAmount: (data['remainingAmount'] ?? 0).toDouble(),
      paidQuotas: data['paidQuotas'] ?? 0,
    );
  }
}
