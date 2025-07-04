import { db, auth } from './firebaseConfig.js';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Admin check
const ADMIN_EMAIL = "sushan.kumar@hostel.com";

// DOM
const loginForm = document.getElementById('adminLogin');
const adminContent = document.getElementById('adminContent');
const logoutBtn = document.getElementById('logoutBtn');
const loginBtn = document.getElementById('adminLoginBtn');
const loginError = document.getElementById('loginError');

const addProductForm = document.getElementById('addProductForm');
const productList = document.getElementById('productList');
const cartItems = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const placeOrderBtn = document.getElementById('placeOrderBtn');
const userOrders = document.getElementById('userOrders');

// Admin Auth
loginBtn?.addEventListener('click', async () => {
  const email = document.getElementById('adminEmail').value;
  const pass = document.getElementById('adminPassword').value;
  try {
    const uc = await signInWithEmailAndPassword(auth,email,pass);
    if (uc.user.email !== ADMIN_EMAIL) {
      await signOut(auth);
      loginError.textContent = "Access denied";
    } else loginError.textContent = "";
  } catch {
    loginError.textContent = "Invalid credentials";
  }
});
logoutBtn?.addEventListener('click', () => signOut(auth));

// Auth state
onAuthStateChanged(auth,user => {
  if (user?.email === ADMIN_EMAIL) {
    loginForm.classList.add('hidden');
    adminContent.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    loadProductsAdmin(); loadOrdersAdmin();
  } else {
    loginForm.classList.remove('hidden');
    adminContent.classList.add('hidden');
    logoutBtn.classList.add('hidden');
  }
});

// Load for users
onSnapshot(collection(db,'products'),snap => {
  productList.innerHTML = '';
  const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const cat = document.getElementById('categorySelect')?.value || 'all';
  snap.forEach(d => {
    const p = d.data();
    if ((cat==='all'||p.category===cat) && p.name.toLowerCase().includes(search)) {
      const el = document.createElement('div');
      el.className='product-card';
      el.innerHTML=`
        <img src="${p.image}" alt="">
        <h3>${p.name}</h3><p>₹${p.price}</p>
        <button onclick="addToCart('${d.id}','${p.name}',${p.price})">Add to Cart</button>`;
      productList.appendChild(el);
    }
  });
});

// Filters reload
['searchInput','categorySelect'].forEach(id=>{
  document.getElementById(id)?.addEventListener('input',()=>{/* no-op reload*/location.reload();});
});

// Cart functions
function getCart(){return JSON.parse(localStorage.getItem('cart')||'[]');}
function setCart(c){localStorage.setItem('cart',JSON.stringify(c));}
window.addToCart=(id,name,price)=>{
  const c=getCart(),ex=c.find(p=>p.id===id);
  ex?ex.quantity++:c.push({id,name,price,quantity:1});
  setCart(c); alert("Added to cart!");
};
if(cartItems){
  const c=getCart(); let tot=0;
  cartItems.innerHTML=''; c.forEach(i=>{
    tot+=i.price*i.quantity;
    cartItems.innerHTML+=`
      <div class="product-card">
        <h3>${i.name}</h3><p>Qty: ${i.quantity}</p>
        <p>₹${i.price*i.quantity}</p>
      </div>`;
  });
  cartTotalEl.textContent=tot;
}

// Remember Me and order placement
if(placeOrderBtn){
  const mb=document.getElementById('rememberMe');
  ['userName','userRoom','userMobile'].forEach(id=>{
    const el=document.getElementById(id), v=localStorage.getItem(id);
    if(el&&v) el.value=v;
  });
  placeOrderBtn.addEventListener('click',async()=>{
    const name=document.getElementById('userName').value.trim(),
      room=document.getElementById('userRoom').value.trim(),
      mobile=document.getElementById('userMobile').value.trim(),
      cart=getCart();
    if(!name||!room||!mobile||cart.length===0)return alert("Complete info & cart");
    if(mb.checked){
      ['userName','userRoom','userMobile'].forEach(id=>{
        localStorage.setItem(id,document.getElementById(id).value);
      });
    }
    await addDoc(collection(db,'orders'),{
      username:name, room, mobile, items:cart, status:"Pending", createdAt:new Date()
    });
    setCart([]); alert("Order placed!");
    location.href="orders.html";
  });
}

// View user orders
onSnapshot(collection(db,'orders'),snap=>{
  userOrders.innerHTML='';
  let username=prompt("Enter your name:");
  snap.forEach(d=>{
    const o=d.data();
    if(o.username===username){
      let tot=0; let inner='';
      o.items.forEach(i=>{
        inner+=`<p>${i.name} × ${i.quantity} = ₹${i.price*i.quantity}</p>`;
        tot+=i.price*i.quantity;
      });
      userOrders.innerHTML+=`
        <div class="product-card">
          <h3>${o.username}</h3><p>Room: ${o.room}</p><p>Mob: ${o.mobile}</p>
          ${inner}<p><strong>Total:₹${tot}</strong></p><p>Status: ${o.status}
        </div>`;
    }
  });
});

// Admin product & order
function loadProductsAdmin(){
  const el=document.getElementById('adminProductList');
  onSnapshot(collection(db,'products'),snap=>{
    el.innerHTML='';
    const search=document.getElementById('adminSearchInput').value.toLowerCase();
    const cat=document.getElementById('adminCategorySelect').value;
    snap.forEach(d=>{
      const p=d.data();
      if((cat==='all'||p.category===cat)&&p.name.toLowerCase().includes(search)){
        el.innerHTML+=`
          <div class="product-card">
            <img src="${p.image}" alt="">
            <h3>${p.name}</h3><p>₹${p.price}</p><p>Cat: ${p.category}</p>
            <button onclick="deleteProduct('${d.id}')">Delete</button>
          </div>`;
      }
    });
  });
}
async function deleteProduct(id){await deleteDoc(doc(db,'products',id));}

addProductForm?.addEventListener('submit',async e=>{
  e.preventDefault();
  const n=document.getElementById('productName').value,
        ca=document.getElementById('productCategory').value,
        pr=parseInt(document.getElementById('productPrice').value),
        im=document.getElementById('productImage').value;
  await addDoc(collection(db,'products'),{name:n,category:ca,price:pr,image:im});
  addProductForm.reset();
});

function loadOrdersAdmin(){
  const el=document.getElementById('allOrders');
  onSnapshot(collection(db,'orders'),snap=>{
    el.innerHTML='';
    snap.forEach(d=>{
      const o=d.data(); let tot=0; let str='';
      o.items.forEach(i=>{
        str+=`<p>${i.name} × ${i.quantity} = ₹${i.quantity*i.price}</p>`;
        tot+=i.quantity*i.price;
      });
      el.innerHTML+=`
        <div class="product-card">
          <h3>${o.username}</h3><p>Room:${o.room} Mob:${o.mobile}</p>
          ${str}<p><strong>Total ₹${tot}</strong></p>
          <p>Status: ${o.status}</p>
          <button onclick="updateOrder('${d.id}','Pending')">Pending</button>
          <button onclick="updateOrder('${d.id}','Delivered')">Delivered</button>
        </div>`;
    });
  });
}
async function updateOrder(id,s){await updateDoc(doc(db,'orders',id),{status:s});}

// Filters reload
['adminSearchInput','adminCategorySelect'].forEach(id=>{
  document.getElementById(id)?.addEventListener('input',()=>loadProductsAdmin());
});




