import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, deleteDoc, updateDoc,
  doc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from './firebaseConfig.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const ADMIN_EMAIL = "sushan.kumar@hostel.com";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("admin-login");
  const adminContent = document.getElementById("admin-content");
  const logoutBtn = document.getElementById("logoutBtn");
  const ordersContainer = document.getElementById("ordersContainer");
  const productsContainer = document.getElementById("productsContainer");
  const productForm = document.getElementById("product-form");

  // --- Admin Auth ---
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = loginForm.email.value;
      const password = loginForm.password.value;

      signInWithEmailAndPassword(auth, email, password)
        .then(() => {
          loginForm.reset();
        })
        .catch(err => {
          alert("Login failed: " + err.message);
        });
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      signOut(auth);
    });
  }

  onAuthStateChanged(auth, (user) => {
    if (user && user.email === ADMIN_EMAIL) {
      if (loginForm) loginForm.classList.add("hidden");
      if (adminContent) adminContent.classList.remove("hidden");
      if (logoutBtn) logoutBtn.classList.remove("hidden");
      loadProductsAdmin();
      loadOrdersAdmin();
    } else {
      if (adminContent) adminContent.classList.add("hidden");
      if (loginForm) loginForm.classList.remove("hidden");
      if (logoutBtn) logoutBtn.classList.add("hidden");
      if (user) signOut(auth); // unauthorized user
    }
  });

  // --- Admin: Load & Render Products ---
  function loadProductsAdmin() {
    if (!productsContainer) return;
    onSnapshot(collection(db, "products"), (snapshot) => {
      productsContainer.innerHTML = "";
      snapshot.forEach(docSnap => {
        const product = docSnap.data();
        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
          <h3>${product.name}</h3>
          <p>Price: ₹${product.price}</p>
          <p>Category: ${product.category}</p>
          <button class="edit-btn" data-id="${docSnap.id}">Edit</button>
          <button class="delete-btn" data-id="${docSnap.id}">Delete</button>
        `;
        productsContainer.appendChild(card);
      });

      // Delete buttons
      productsContainer.querySelectorAll(".delete-btn").forEach(btn => {
        btn.onclick = () => deleteDoc(doc(db, "products", btn.dataset.id));
      });

      // Edit buttons
      productsContainer.querySelectorAll(".edit-btn").forEach(btn => {
        btn.onclick = async () => {
          const docRef = doc(db, "products", btn.dataset.id);
          const productDoc = await getDocs(collection(db, "products"));
          productDoc.forEach(docSnap => {
            if (docSnap.id === btn.dataset.id) {
              const data = docSnap.data();
              document.getElementById("name").value = data.name;
              document.getElementById("price").value = data.price;
              document.getElementById("category").value = data.category;
              document.getElementById("productId").value = btn.dataset.id;
            }
          });
        };
      });
    });
  }

  // --- Admin: Submit Product (Add or Edit) ---
  if (productForm) {
    productForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = productForm.name.value;
      const price = parseFloat(productForm.price.value);
      const category = productForm.category.value;
      const id = productForm.productId.value;

      if (id) {
        await updateDoc(doc(db, "products", id), { name, price, category });
      } else {
        await addDoc(collection(db, "products"), { name, price, category });
      }

      productForm.reset();
    });
  }

  // --- Admin: Load Orders ---
  function loadOrdersAdmin() {
    if (!ordersContainer) return;
    onSnapshot(collection(db, "orders"), (snapshot) => {
      ordersContainer.innerHTML = "";
      snapshot.forEach(docSnap => {
        const order = docSnap.data();
        const card = document.createElement("div");
        card.className = "product-card";
        const productsHTML = order.cart.map(item =>
          `<li>${item.name} (x${item.quantity}) - ₹${item.price * item.quantity}</li>`
        ).join("");
        card.innerHTML = `
          <h3>${order.name} - Room ${order.room}</h3>
          <p>📞 ${order.mobile}</p>
          <ul>${productsHTML}</ul>
          <p><strong>Total:</strong> ₹${order.total}</p>
          <select data-id="${docSnap.id}" class="status-select">
            <option value="Pending" ${order.status === "Pending" ? "selected" : ""}>Pending</option>
            <option value="Delivered" ${order.status === "Delivered" ? "selected" : ""}>Delivered</option>
          </select>
        `;
        ordersContainer.appendChild(card);
      });

      // Status Change
      ordersContainer.querySelectorAll(".status-select").forEach(select => {
        select.addEventListener("change", () => {
          updateDoc(doc(db, "orders", select.dataset.id), {
            status: select.value
          });
        });
      });
    });
  }

  // --- Cart Page: Handle Checkout ---
  const checkoutForm = document.getElementById("checkout-form");
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = checkoutForm.name.value;
      const room = checkoutForm.room.value;
      const mobile = checkoutForm.mobile.value;
      const remember = checkoutForm.remember.checked;
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");

      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

      await addDoc(collection(db, "orders"), {
        name, room, mobile, cart, total,
        status: "Pending",
        timestamp: Date.now()
      });

      if (remember) {
        localStorage.setItem("userInfo", JSON.stringify({ name, room, mobile }));
      } else {
        localStorage.removeItem("userInfo");
      }

      localStorage.removeItem("cart");
      alert("Order placed successfully!");
      window.location.href = "orders.html";
    });

    // Load remembered info
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    if (userInfo) {
      checkoutForm.name.value = userInfo.name || "";
      checkoutForm.room.value = userInfo.room || "";
      checkoutForm.mobile.value = userInfo.mobile || "";
      checkoutForm.remember.checked = true;
    }
  }

  // --- Cart Page: Render Cart Items ---
  const cartItemsContainer = document.getElementById("cartItems");
  if (cartItemsContainer) {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
    } else {
      let total = 0;
      cartItemsContainer.innerHTML = cart.map(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        return `
          <div class="product-card">
            <h3>${item.name}</h3>
            <p>Price: ₹${item.price}</p>
            <p>Quantity: ${item.quantity}</p>
            <p>Subtotal: ₹${subtotal}</p>
          </div>
        `;
      }).join("") + `<h2>Total: ₹${total}</h2>`;
    }
  }

  // --- Index Page: Load & Render Products ---
  const productsGrid = document.getElementById("products");
  const categoryFilter = document.getElementById("categoryFilter");
  const searchInput = document.getElementById("searchInput");

  if (productsGrid) {
    onSnapshot(collection(db, "products"), (snapshot) => {
      const products = [];
      snapshot.forEach(doc => {
        products.push({ id: doc.id, ...doc.data() });
      });
      renderProducts(products);

      if (categoryFilter) {
        categoryFilter.addEventListener("change", () => {
          renderProducts(products);
        });
      }
      if (searchInput) {
        searchInput.addEventListener("input", () => {
          renderProducts(products);
        });
      }

      function renderProducts(all) {
        let filtered = [...all];
        const category = categoryFilter?.value;
        const search = searchInput?.value.toLowerCase();

        if (category && category !== "all") {
          filtered = filtered.filter(p => p.category.toLowerCase() === category.toLowerCase());
        }
        if (search) {
          filtered = filtered.filter(p => p.name.toLowerCase().includes(search));
        }

        productsGrid.innerHTML = filtered.map(prod => `
          <div class="product-card">
            <h3>${prod.name}</h3>
            <p>₹${prod.price}</p>
            <button onclick="addToCart('${prod.id}', '${prod.name}', ${prod.price})">Add to Cart</button>
          </div>
        `).join("");
      }
    });
  }

  // --- Add to Cart Function (Global) ---
  window.addToCart = function (id, name, price) {
    let cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find(p => p.id === id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ id, name, price, quantity: 1 });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    alert("Added to cart");
  };
});





