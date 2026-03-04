import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';

const OWNER_EMAIL = 'erickrendon18@gmail.com';

export function usePremium() {
    const [isPremium, setIsPremium] = useState(false);
    const [premiumLoading, setPremiumLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            setPremiumLoading(false);
            return;
        }

        // Owner always has premium
        if (user.email === OWNER_EMAIL) {
            setIsPremium(true);
            setPremiumLoading(false);
            return;
        }

        const ref = doc(db, 'users', user.uid, 'premium', 'status');
        const unsub = onSnapshot(ref, (snap) => {
            if (snap.exists() && snap.data().isPremium === true) {
                setIsPremium(true);
            } else {
                setIsPremium(false);
            }
            setPremiumLoading(false);
        });

        return () => unsub();
    }, []);

    return { isPremium, premiumLoading };
}
