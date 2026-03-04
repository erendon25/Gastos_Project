import SwiftUI
import FirebaseCore

@main
struct FluxApp: App {
    @StateObject var authViewModel: AuthViewModel
    
    init() {
        // Inicializamos Firebase ANTES de llamar cualquier cosa de AuthViewModel
        FirebaseApp.configure()
        
        // Ahora es seguro crear el ViewModel que internamente usa Auth.auth()
        _authViewModel = StateObject(wrappedValue: AuthViewModel())
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authViewModel)
                .preferredColorScheme(.dark)
        }
    }
}
