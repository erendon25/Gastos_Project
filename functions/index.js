const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

admin.initializeApp();
const db = admin.firestore();

// ── Config ─────────────────────────────────────────────────────────────────
// Set these with:
//   firebase functions:config:set mercadopago.access_token="YOUR_ACCESS_TOKEN"
//   firebase functions:config:set mercadopago.webhook_secret="YOUR_WEBHOOK_SECRET"
const MP_ACCESS_TOKEN = functions.config().mercadopago?.access_token || '';
const APP_URL = 'https://gastos-110bb.web.app';
const PRICE_ARS = 5.00; // Price in PEN (soles)
const CURRENCY = 'PEN';  // ISO currency code

// ── Helper: initialize MercadoPago client ──────────────────────────────────
function getMPClient() {
    return new MercadoPagoConfig({
        accessToken: MP_ACCESS_TOKEN,
        options: { timeout: 5000 }
    });
}

// ── 1. Create Payment Preference ──────────────────────────────────────────
// Called from frontend when user clicks "Vuélvete PRO"
exports.createPreference = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
    }

    const uid = context.auth.uid;
    const email = context.auth.token.email || '';

    const client = getMPClient();
    const preferenceClient = new Preference(client);

    const preference = await preferenceClient.create({
        body: {
            items: [
                {
                    id: 'flux_pro_monthly',
                    title: 'FLUX PRO - Suscripción Mensual',
                    description: 'Gastos ilimitados, gráficos, suscripciones digitales y más',
                    category_id: 'services',
                    quantity: 1,
                    currency_id: CURRENCY,
                    unit_price: PRICE_ARS,
                }
            ],
            payer: {
                email: email,
            },
            back_urls: {
                success: `${APP_URL}/payment-success?uid=${uid}`,
                failure: `${APP_URL}/payment-failure`,
                pending: `${APP_URL}/payment-pending`,
            },
            auto_return: 'approved',
            notification_url: `https://us-central1-gastos-110bb.cloudfunctions.net/mpWebhook`,
            metadata: {
                uid: uid,
                email: email,
            },
            statement_descriptor: 'FLUX PRO',
        }
    });

    return {
        checkoutUrl: preference.init_point,
        preferenceId: preference.id,
    };
});

// ── 2. MercadoPago Webhook ─────────────────────────────────────────────────
// Receives payment notifications from MercadoPago
exports.mpWebhook = functions.https.onRequest(async (req, res) => {
    // Only process POST requests
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
        const { type, data } = req.body;

        // Only process payment notifications
        if (type !== 'payment') {
            res.status(200).send('OK');
            return;
        }

        const paymentId = data?.id;
        if (!paymentId) {
            res.status(400).send('Missing payment ID');
            return;
        }

        // Fetch full payment details from MercadoPago
        const client = getMPClient();
        const paymentClient = new Payment(client);
        const payment = await paymentClient.get({ id: paymentId });

        console.log('Payment received:', JSON.stringify({
            id: payment.id,
            status: payment.status,
            metadata: payment.metadata,
        }));

        // Only activate PRO for approved payments
        if (payment.status === 'approved') {
            const uid = payment.metadata?.uid;

            if (!uid) {
                console.error('No UID in payment metadata');
                res.status(400).send('Missing UID');
                return;
            }

            // Set user as premium in Firestore
            await db.doc(`users/${uid}/premium/status`).set({
                isPremium: true,
                activatedAt: admin.firestore.FieldValue.serverTimestamp(),
                paymentId: String(payment.id),
                plan: 'monthly',
                amount: payment.transaction_amount,
                currency: payment.currency_id,
                payerEmail: payment.payer?.email || '',
            }, { merge: true });

            console.log(`✅ User ${uid} activated as PRO`);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send('Internal Error');
    }
});

// ── 3. Mark PRO manually (admin use) ──────────────────────────────────────
// Emergency function to manually activate PRO for a user
exports.activateProManual = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'No autorizado');
    }

    // Only allow the owner to call this
    const OWNER_EMAIL = 'erickrendon18@gmail.com';
    if (context.auth.token.email !== OWNER_EMAIL) {
        throw new functions.https.HttpsError('permission-denied', 'No tienes permiso');
    }

    const { targetUid } = data;
    if (!targetUid) throw new functions.https.HttpsError('invalid-argument', 'targetUid requerido');

    await db.doc(`users/${targetUid}/premium/status`).set({
        isPremium: true,
        activatedAt: admin.firestore.FieldValue.serverTimestamp(),
        plan: 'manual',
        paymentId: 'owner_grant',
    }, { merge: true });

    return { success: true, message: `User ${targetUid} activated as PRO` };
});
