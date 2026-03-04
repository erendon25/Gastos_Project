import Foundation
import Combine
import SwiftUI
import FirebaseFirestore
import FirebaseAuth
class DashboardViewModel: ObservableObject {
    @Published var totalIncome: Double = 0.0
    @Published var totalExpenses: Double = 0.0
    
    // We can add fixed costs, debt, etc if wanted
    
    func fetchCurrentMonthData() {
        let db = Firestore.firestore()
        guard let user = Auth.auth().currentUser else { return }
        
        let now = Date()
        let calendar = Calendar.current
        let currentMonth = calendar.component(.month, from: now)
        let currentYear = calendar.component(.year, from: now)
        
        // Simplified Logic: Fetch all data and calculate locally 
        // similar to what's done in the Web App React snapshot listeners.
        db.collection("users").document(user.uid).collection("ingresos")
            .addSnapshotListener { snapshot, error in
                guard let documents = snapshot?.documents else { return }
                var monthlyIncome = 0.0
                for doc in documents {
                    let data = doc.data()
                    guard let timestamp = data["date"] as? Timestamp else { continue }
                    let date = timestamp.dateValue()
                    
                    // Simple check if same month and year
                    if calendar.component(.month, from: date) == currentMonth &&
                       calendar.component(.year, from: date) == currentYear {
                        monthlyIncome += (data["amount"] as? Double ?? 0.0)
                    }
                }
                DispatchQueue.main.async { self.totalIncome = monthlyIncome }
            }
            
        db.collection("users").document(user.uid).collection("gastos")
            .addSnapshotListener { snapshot, error in
                guard let documents = snapshot?.documents else { return }
                var monthlyExpenses = 0.0
                for doc in documents {
                    let data = doc.data()
                    guard let timestamp = data["date"] as? Timestamp else { continue }
                    let date = timestamp.dateValue()
                    
                    if calendar.component(.month, from: date) == currentMonth &&
                       calendar.component(.year, from: date) == currentYear {
                        monthlyExpenses += (data["amount"] as? Double ?? 0.0)
                    }
                }
                DispatchQueue.main.async { self.totalExpenses = monthlyExpenses }
            }
    }
}
