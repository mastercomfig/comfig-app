import { Howl } from "howler";

import fastClone from "./fastClone";
import { filterString } from "./filter";
import {
  addInventory,
  addListing,
  buyListing,
  enterRaffle,
  items,
  subscribeAllWallets,
  subscribeAuth,
  subscribeInventory,
  subscribeListing,
  subscribeRaffle,
  subscribeRaffleListing,
  subscribeWallet,
  updateInventoryExpire,
  updateWalletName,
  withdrawListing,
} from "./giftCard";

export function giftCard() {
  const coinGrab = new Howl({
    src: "/assets/giftcard/coingrab.wav",
  });
  const walletEl = document.getElementById("giftCardWallet") as HTMLElement;
  const inventoryEls: Record<string, HTMLElement> = {};
  const marketEls: Record<string, HTMLElement> = {};
  for (const item of items) {
    inventoryEls[item] = document.getElementById(
      `my-item-${item}`,
    ) as HTMLElement;
    marketEls[item] = document.getElementById(`item-${item}`) as HTMLElement;
  }
  const raffleEl = document.getElementById("giftCardRaffle") as HTMLElement;
  const leaderboardEl = document.getElementById(
    "giftCardLeaderboard",
  ) as HTMLElement;
  const saleListingsEl = document.getElementById(
    "giftCardSales",
  ) as HTMLElement;
  const accountNameBanner = document.getElementById(
    "account-name-banner",
  ) as HTMLElement;
  const timeouts = {};

  let hasAuthed = false;

  function addTimeout(userId, item, timeout) {
    if (timeouts[item] !== undefined) {
      return;
    }
    const now = Date.now();
    const timer = timeout - now;
    function onTimeout() {
      // clear out
      delete timeouts[item];
      // remove an item
      addInventory(userId, { [item]: -1 });
      // update expiration time
      updateInventoryExpire(userId, { [item]: 0 });
    }
    if (timer <= 0) {
      onTimeout();
      return;
    }
    const handle = setTimeout(onTimeout, timer);
    timeouts[item] = handle;
  }

  const defaultInventory = {
    ticket: { count: 0 },
    key: { count: 0 },
    tux: { count: 0 },
    pepper: { count: 0 },
    hat: { count: 0 },
    pan: { count: 0 },
  };

  function ordinalSuffixOf(i) {
    const j = i % 10;
    const k = i % 100;
    if (j === 1 && k !== 11) {
      return i + "st";
    }
    if (j === 2 && k !== 12) {
      return i + "nd";
    }
    if (j === 3 && k !== 13) {
      return i + "rd";
    }
    return i + "th";
  }

  function onUser(user) {
    let walletTotal = -1;
    const username = user.email.split("@")[0];
    accountNameBanner.innerText = username;
    subscribeWallet(user.uid, (data) => {
      const promo = 50;
      const funds = data?.["funds"] ?? 0;
      const newTotal = promo + funds;
      if (walletTotal >= 0 && newTotal > walletTotal) {
        coinGrab.play();
      }
      if (!data?.name) {
        updateWalletName(user.uid, username);
      }
      walletTotal = promo + funds;
      walletEl.innerText = `$${walletTotal.toFixed(2)}`;
    });
    subscribeAllWallets((data) => {
      if (!data) {
        data = {
          [user.uid]: {
            funds: 0,
          },
        };
      }
      const wallets = [];
      for (const [uid, wallet] of Object.entries(data)) {
        const funds = wallet?.["funds"] ?? 0;
        const name = wallet?.["name"];
        if (!name) {
          continue;
        }
        wallets.push({ uid, funds: Math.max(funds, 0), name });
      }
      console.log(wallets);
      wallets.sort(
        (a, b) => b.funds - a.funds || a.toString().localeCompare(b.toString()),
      );
      let place = wallets.findIndex((element) => element.uid === user.uid) + 1;
      if (place === 0) {
        place = "last";
      } else {
        place = ordinalSuffixOf(place);
      }
      let walletStrBuild = "";
      let curPlace = 1;
      for (const wallet of wallets) {
        const total = wallet.funds + 50;
        if (total <= 50) {
          continue;
        }
        walletStrBuild += ` <b>${curPlace}</b>. ${filterString(wallet.name)} .... $${total.toFixed(2)}<br/>`;
        curPlace += 1;
        if (curPlace > 10) {
          break;
        }
      }
      leaderboardEl.innerHTML = `<p>You are in <b>${place}</b> place.<br/>${walletStrBuild}</p>`;
    });
    const selling = { v: false };
    subscribeInventory(user.uid, (data) => {
      if (!data) {
        data = {};
      }
      data = { ...defaultInventory, ...data };
      selling.v = false;
      for (const [k, v] of Object.entries(data)) {
        const myItem = inventoryEls[k];
        const sellPrice = document.getElementById(
          `sell-price-${k}`,
        ) as HTMLInputElement;
        const sellBtn = document.getElementById(
          `sell-btn-${k}`,
        ) as HTMLButtonElement;
        const curCount = myItem?.querySelector(".cur-count") as HTMLElement;
        if (v.count > 0) {
          if (v.expire) {
            addTimeout(user.uid, k, v.expire);
          }
          myItem?.classList.add("has-items");
          myItem?.classList.remove("no-items");
          sellPrice.disabled = false;
          sellBtn.disabled = false;
          sellBtn.onclick = () => {
            if (selling.v) {
              return;
            }
            const sale = Number(Number(sellPrice.value).toFixed(2));
            if (sale < 0.03) {
              return;
            }
            addListing(user.uid, k, sale);
          };
          curCount.innerText = String(v.count);
        } else {
          myItem?.classList.add("no-items");
          myItem?.classList.remove("has-items");
          sellPrice.disabled = true;
          sellBtn.disabled = true;
          sellBtn.onclick = () => {};
          curCount.innerText = "0";
        }
      }
    });
    let bestListing = {};
    const buying = { v: false };
    const withdrawing = { v: false };
    subscribeListing((data) => {
      if (!data) {
        data = {};
      }
      const diff = fastClone(bestListing);
      for (const [k, v] of Object.entries(diff)) {
        diff[k] = v.price;
      }
      const itemCount = {};
      bestListing = {};
      const myListings = {};
      for (const [sellerId, listings] of Object.entries(data)) {
        for (const [listingId, listing] of Object.entries(listings)) {
          const item = listing.item;
          if (itemCount[item] === undefined) {
            itemCount[item] = 0;
          }
          itemCount[item] += 1;
          if (sellerId === user.uid) {
            myListings[listingId] = listing;
            continue;
          }
          const bestListingItem = bestListing[item];
          const bestListingPrice = bestListingItem?.price ?? Infinity;
          const price = listing.price;
          if (price < bestListingPrice) {
            bestListing[item] = {
              sellerId,
              listingId,
              price,
            };
          }
        }
      }
      for (const itemKey of Object.keys(diff)) {
        if (bestListing[itemKey] === undefined) {
          delete diff[itemKey];
        }
      }
      for (const itemKey of Object.keys(bestListing)) {
        diff[itemKey] = bestListing[itemKey].price - (diff[itemKey] ?? 0);
      }

      if (Object.keys(myListings).length < 1) {
        saleListingsEl.innerHTML = "<p>No market listings</p>";
      } else {
        saleListingsEl.innerHTML = "";
      }
      for (const [listingId, listing] of Object.entries(myListings)) {
        const row = document.createElement("div");
        row.classList.add(
          "row",
          "align-items-center",
          "bg-body",
          "my-2",
          "py-1",
        );
        const first = document.createElement("div");
        first.classList.add("col");
        const img = document.createElement("img");
        img.classList.add("img-fluid");
        img.style.maxHeight = "4rem";
        img.src = `/img/giftcard/items/${listing.item}.png`;
        first.appendChild(img);
        row.appendChild(first);
        const second = document.createElement("div");
        second.classList.add("col");
        second.innerText = `$${listing.price.toFixed(2)}`;
        row.appendChild(second);
        const third = document.createElement("div");
        third.classList.add("col");
        const btn = document.createElement("button");
        btn.classList.add("btn", "btn-danger", "btn-sm");
        btn.innerText = "Cancel";
        btn.onclick = () => {
          if (withdrawing.v) {
            return;
          }
          withdrawing.v = true;
          withdrawListing(user.uid, listingId, listing.item).then(() => {
            withdrawing.v = false;
          });
        };
        third.appendChild(btn);
        row.appendChild(third);
        saleListingsEl.appendChild(row);
      }
      for (const [item, itemEl] of Object.entries(marketEls)) {
        const curAmount = itemEl?.querySelector(".cur-amount") as HTMLElement;
        curAmount.innerText = itemCount[item] ?? 0;
        const listing = bestListing[item];
        const curPrice = itemEl.querySelector(".cur-price") as HTMLElement;
        const diffPrice = itemEl.querySelector(".diff-price") as HTMLElement;
        if (listing === undefined) {
          itemEl.onclick = () => {};
          itemEl.classList.add("no-items");
          itemEl.classList.remove("has-items");
          curPrice.innerText = "";
          diffPrice.innerText = "";
          continue;
        }
        itemEl.classList.remove("no-items");
        itemEl.classList.add("has-items");
        const delta = diff[item] ?? 0;
        curPrice.innerText = `$${listing.price.toFixed(2)}`;
        if (delta === 0) {
          diffPrice.innerText = "";
        } else {
          if (delta > 0) {
            diffPrice.innerText = `+${Number(delta).toFixed(2)}`;
            diffPrice.classList.add("text-success");
            diffPrice.classList.remove("text-danger");
          } else {
            diffPrice.innerText = `${Number(delta).toFixed(2)}`;
            diffPrice.classList.add("text-danger");
            diffPrice.classList.remove("text-success");
          }
        }
        itemEl.onclick = () => {
          if (buying.v) {
            return;
          }
          buying.v = true;
          if (walletTotal >= listing.price) {
            buyListing(
              user.uid,
              listing.sellerId,
              listing.listingId,
              item,
              listing.price,
              () => {
                buying.v = false;
              },
            );
          }
        };
      }
    });
    subscribeRaffle((data) => {
      if (!data) {
        raffleEl.innerHTML = "<p>No raffles available</p>";
        return;
      }
      raffleEl.innerHTML = "";
      for (const [raffleId, raffle] of Object.entries(data)) {
        const container = document.createElement("div");
        const row = document.createElement("div");
        row.classList.add("row");
        const left = document.createElement("div");
        left.classList.add("col");
        const right = document.createElement("div");
        right.classList.add("col");
        const mid = document.createElement("div");
        mid.classList.add("col");
        const button = document.createElement("button");
        const para = document.createElement("p");
        const counter = document.createElement("p");
        counter.innerText = "0 / 0";
        counter.id = `count_${raffleId}`;
        mid.appendChild(counter);
        left.appendChild(para);
        right.appendChild(button);
        row.appendChild(left);
        row.appendChild(mid);
        row.appendChild(right);
        container.appendChild(row);
        button.innerText = "Enter raffle ($1)";
        button.classList.add("btn", "btn-success", "btn-sm");
        button.onclick = () => {
          button.disabled = true;
          enterRaffle(user.uid, raffleId).then(() => {
            button.disabled = false;
          });
        };
        const now = Date.now();
        function updateTimer() {
          const remaining = raffle.raffleTime - now;
          const minutes = Math.floor(
            (remaining % (1000 * 60 * 60)) / (1000 * 60),
          );
          const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
          para.innerText = `${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
        }
        updateTimer();
        const handle = setInterval(() => {
          const now = Date.now();
          const remaining = raffle.raffleTime - now;
          if (remaining < 0) {
            if (handle) {
              clearInterval(handle);
            }
            button.remove();
            return;
          }
          const minutes = Math.floor(
            (remaining % (1000 * 60 * 60)) / (1000 * 60),
          );
          const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
          para.innerText = `${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
        }, 1000);
        raffleEl.appendChild(container);
      }
    });
    subscribeRaffleListing((data) => {
      if (!data) {
        return;
      }
      const raffleCounts = {};
      for (const [userId, raffles] of Object.entries(data)) {
        for (const [raffleId, entries] of Object.entries(raffles)) {
          if (raffleCounts[raffleId] === undefined) {
            raffleCounts[raffleId] = {
              mine: 0,
              theirs: 0,
            };
          }
          if (userId === user.uid) {
            raffleCounts[raffleId].mine += entries;
          } else {
            raffleCounts[raffleId].theirs += entries;
          }
        }
      }

      for (const [raffleId, counts] of Object.entries(raffleCounts)) {
        const counter = document.getElementById(`count_${raffleId}`);
        counter.innerText = `${counts.mine} / ${counts.theirs + counts.mine}`;
      }
    });
  }

  subscribeAuth((user) => {
    if (user) {
      if (!hasAuthed) {
        hasAuthed = true;
        onUser(user);
      }
    } else {
      window.location.href = "/giftcard/";
    }
  });
}
