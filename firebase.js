
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "jaat-chatbot.firebaseapp.com",
  projectId: "jaat-chatbot",
  storageBucket: "jaat-chatbot.appspot.com",
  messagingSenderId: "320196934226",
  appId: "1:320196934226:web:716b8f6e6912d1a8f6bd8b",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export async function saveChat(userMessage, botReply, userName) {
  try {
    await addDoc(collection(db, "chatHistory"), {
      userMessage,
      botReply,
      user: userName,
      time: Date.now(),
    });
  } catch (err) {
    console.error("Error saving chat:", err);
  }
}
