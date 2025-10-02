// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  type NextOrObserver,
  type User,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  type Unsubscribe,
  getDatabase,
  increment,
  onValue,
  push,
  ref,
  runTransaction,
  set,
  update,
} from "firebase/database";

// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyATiSBWksyFiqduyEjrbAUGbMIp4Qq7N-s",
  authDomain: "comfig-giftcards.firebaseapp.com",
  projectId: "comfig-giftcards",
  storageBucket: "comfig-giftcards.firebasestorage.app",
  messagingSenderId: "456106717482",
  appId: "1:456106717482:web:67d624e2e4623cddeeee53",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

export function giftSignIn(
  username: string,
  password: string,
  callback: (user: User | undefined, err: undefined) => void,
) {
  const email = `${username}@gifts.comfig.app`;
  /* 
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed up
      const user = userCredential.user;
      callback(user, undefined);
    })
    .catch((error) => {
      const errorCode = error.code;
      // We don't need to sign up, try signing in
      if (errorCode === AuthErrorCodes.EMAIL_EXISTS) {
        signInWithEmailAndPassword(auth, email, password)
          .then((userCredential) => {
            // Signed in
            const user = userCredential.user;
            callback(user, undefined);
          })
          .catch((error) => {
            callback(undefined, error);
          });
      } else {
        callback(undefined, error);
      }
    });
  */
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed in
      const user = userCredential.user;
      callback(user, undefined);
    })
    .catch((error) => {
      callback(undefined, error);
    });
}

export function subscribeAuth(callback: NextOrObserver<User>) {
  return onAuthStateChanged(auth, callback);
}

export function redirectOnAuth() {
  const unsubscribe: { fn: (() => void) | undefined } = { fn: undefined };
  function subscription(user) {
    if (user) {
      if (unsubscribe.fn) {
        unsubscribe.fn();
      }
      window.location.href = "/giftcard/store";
    }
  }
  unsubscribe.fn = subscribeAuth(subscription);
}

// Initialize Realtime Database and get a reference to the service
const db = getDatabase(app);

const subscriptions: Record<string, Unsubscribe> = {};

function handleSub(id: string, newSub: Unsubscribe) {
  if (subscriptions[id]) {
    subscriptions[id]();
    delete subscriptions[id];
  }
  subscriptions[id] = newSub;
}

export const items = ["ticket", "key", "tux", "pepper", "hat", "pan"];

export const expirationTime = {
  ticket: 300,
  key: 600,
  tux: 900,
  pepper: 1200,
  hat: 1500,
  pan: 1800,
};

interface InventoryAdd {
  ticket?: number;
  key?: number;
  tux?: number;
  pepper?: number;
  hat?: number;
  pan?: number;
}

export function subscribeWallet(
  userId: string,
  callback: (data: object | null) => void,
) {
  const walletRef = ref(db, `wallet/${userId}`);
  handleSub(
    "wallet",
    onValue(walletRef, (snapshot) => {
      const data = snapshot.val();
      callback(data);
    }),
  );
}

export function subscribeAllWallets(callback: (data: object | null) => void) {
  const walletRef = ref(db, "wallet");
  handleSub(
    "wallets",
    onValue(walletRef, (snapshot) => {
      const data = snapshot.val();
      callback(data);
    }),
  );
}

export function updateWallet(userId: string, funds: number) {
  const updates = {
    [`wallet/${userId}/funds`]: increment(funds),
  };
  return update(ref(db), updates);
}

export function updateWalletName(userId: string, name: string) {
  return set(ref(db, `wallet/${userId}/name`), name);
}

export function subscribeInventory(
  userId: string,
  callback: (data: object | null) => void,
) {
  const inventoryRef = ref(db, `inventory/${userId}`);
  handleSub(
    "inventory",
    onValue(inventoryRef, (snapshot) => {
      const data = snapshot.val();
      callback(data);
    }),
  );
}

export function addInventory(userId: string, inventory: InventoryAdd) {
  const now = Date.now();
  for (const [k, v] of Object.entries(inventory)) {
    runTransaction(ref(db, `inventory/${userId}/${k}`), (item) => {
      if (item) {
        item.count += v;
        if (item.count <= 0) {
          item.count = 0;
          item.expire = 0;
        } else if (!item.expire) {
          item.expire = now + expirationTime[k] * 1000;
        }
        return item;
      } else if (v === 0) {
        return {
          count: 0,
        };
      } else if (v > 0) {
        return {
          count: v,
          expire: now + expirationTime[k] * 1000,
        };
      }
    });
  }
}

export function updateInventoryExpire(userId: string, inventory: InventoryAdd) {
  const updates = {};
  const now = Date.now();
  for (const k of Object.keys(inventory)) {
    const expire = now + expirationTime[k] * 1000;
    updates[`inventory/${userId}/${k}/expire`] = expire;
  }
  update(ref(db), updates);
}

export function subscribeListing(callback: (data: object | null) => void) {
  const listingRef = ref(db, "listing");
  handleSub(
    "listing",
    onValue(listingRef, (snapshot) => {
      const data = snapshot.val();
      callback(data);
    }),
  );
}

export function addListing(userId: string, item: string, price: number) {
  addInventory(userId, {
    [item]: -1,
  });
  const listingRef = ref(db, `listing/${userId}`);
  const newListingRef = push(listingRef);
  set(newListingRef, {
    item,
    price,
  });
}

export function withdrawListing(
  userId: string,
  listingId: string,
  item: string,
) {
  const listingRef = ref(db, `listing/${userId}/${listingId}`);
  const p = set(listingRef, null);
  addInventory(userId, {
    [item]: 1,
  });
  return p;
}

export function buyListing(
  buyerId: string,
  sellerId: string,
  listingId: string,
  item: string,
  price: number,
  callback,
) {
  // make sure we only adjust wallet once
  const updates = {
    [`listing/${sellerId}/${listingId}`]: null,
    [`wallet/${sellerId}/funds`]: increment(price),
    [`wallet/${buyerId}/funds`]: increment(-price),
  };
  update(ref(db), updates).then(callback);
  addInventory(buyerId, {
    [item]: 1,
  });
}

export function subscribeRaffle(callback: (data: object | null) => void) {
  const raffleRef = ref(db, "raffle");
  handleSub(
    "raffle",
    onValue(raffleRef, (snapshot) => {
      const data = snapshot.val();
      callback(data);
    }),
  );
}

export function subscribeRaffleListing(
  callback: (data: object | null) => void,
) {
  const raffleRef = ref(db, "raffleListing");
  handleSub(
    "raffleListing",
    onValue(raffleRef, (snapshot) => {
      const data = snapshot.val();
      callback(data);
    }),
  );
}

export function enterRaffle(
  userId: string,
  raffleId: string,
  type: string | undefined = undefined,
) {
  let canAfford = true;
  if (type) {
    const itemRef = ref(db, `inventory/${userId}/${type}`);
    return runTransaction(itemRef, (item) => {
      if (item && item.count !== undefined) {
        if (item.count < 1) {
          canAfford = false;
          return item;
        }
        return {
          count: item.count - 1,
          expire: item.expire,
        };
      } else {
        canAfford = false;
        return item;
      }
    }).then(() => {
      if (canAfford) {
        const raffleListingRef = ref(db, `raffleListing/${userId}/${raffleId}`);
        runTransaction(raffleListingRef, (item) => {
          if (item) {
            item++;
            return item;
          } else {
            return 1;
          }
        });
      }
    });
  }
  const walletRef = ref(db, `wallet/${userId}`);
  const rafflePrice = 1;
  return runTransaction(walletRef, (item) => {
    if (item && item.funds !== undefined) {
      if (item.funds + 50 < rafflePrice) {
        canAfford = false;
        return {
          funds: item.funds,
          name: item.name,
        };
      }
      return {
        funds: item.funds - rafflePrice,
        name: item.name,
      };
    } else {
      return {
        funds: -rafflePrice,
        name: item.name,
      };
    }
  }).then(() => {
    if (canAfford) {
      const raffleListingRef = ref(db, `raffleListing/${userId}/${raffleId}`);
      runTransaction(raffleListingRef, (item) => {
        if (item) {
          item++;
          return item;
        } else {
          return 1;
        }
      });
    }
  });
}
