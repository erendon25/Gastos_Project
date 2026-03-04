import SwiftUI
import LocalAuthentication

class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var errorMessage = ""
    @Published var isAuthenticating = false

    func authenticateWithFaceID() {
        let context = LAContext()
        var error: NSError?

        if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
            let reason = "Inicia sesión en Flux para acceder a tus finanzas."
            self.isAuthenticating = true

            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, authenticationError in
                DispatchQueue.main.async {
                    self.isAuthenticating = false
                    if success {
                        withAnimation {
                            self.isAuthenticated = true
                        }
                    } else {
                        self.errorMessage = authenticationError?.localizedDescription ?? "Error de autenticación"
                    }
                }
            }
        } else {
            self.errorMessage = "Face ID / Touch ID no está disponible en este dispositivo."
            // Fallback: Permitir login por contraseña normal
        }
    }
    
    func logout() {
        withAnimation {
            self.isAuthenticated = false
        }
    }
}
