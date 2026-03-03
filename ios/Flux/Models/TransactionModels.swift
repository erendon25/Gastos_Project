import SwiftUI

struct Models {
    struct Transaction: Identifiable {
        let id = UUID()
        let name: String
        let category: String
        let icon: String // Emoji o nombre de imagen del sistema
        let amount: Double
        let date: Date
        let type: TransactionType
    }
    
    enum TransactionType {
        case expense
        case income
    }
}

class TransactionViewModel: ObservableObject {
    @Published var transactions: [Models.Transaction] = [
        Models.Transaction(name: "Supermercado", category: "Alimentación", icon: "🛒", amount: 150.0, date: Date(), type: .expense),
        Models.Transaction(name: "Uber", category: "Transporte", icon: "🚕", amount: 25.0, date: Date(), type: .expense),
        Models.Transaction(name: "Salario", category: "Ingreso", icon: "💰", amount: 3500.0, date: Date().addingTimeInterval(-86400), type: .income),
        Models.Transaction(name: "Netflix", category: "Suscripción", icon: "🎬", amount: 45.0, date: Date().addingTimeInterval(-172800), type: .expense)
    ]
}
