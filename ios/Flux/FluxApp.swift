import SwiftUI

@main
struct FluxApp: App {
    @StateObject var authViewModel = AuthViewModel()
    
    // Si usaras Firebase, aquí inicializarías FirebaseApp.configure()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authViewModel)
                .preferredColorScheme(.dark) // Forzando el tema oscuro premium
        }
    }
}
