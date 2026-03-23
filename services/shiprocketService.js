import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

let cachedToken = null;
let tokenExpiry = 0;


// console.log("SHIPROCKET_EMAIL", process.env.SHIPROCKET_EMAIL );
// console.log("SHIPROCKET_PASSWORD",  process.env.SHIPROCKET_PASSWORD);


// 🟢 Get Shiprocket Token
export async function getShiprocketToken() {
  const now = Date.now();

  if (cachedToken && now < tokenExpiry) {
    return cachedToken; 
  }

  const response = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error("❌ Shiprocket authentication failed");
  }

  const data = await response.json();
  cachedToken = data.token;
  tokenExpiry = now + 10 * 60 * 60 * 1000; // valid for 10 hours
  return cachedToken;
}

// 🟢 Check Serviceability
export async function checkServiceability({
  pickup_postcode,
  delivery_postcode,
  weight = 0.5,
  cod = true,
  mode = "Surface",
}) {
  const token = await getShiprocketToken();

  const url = new URL("https://apiv2.shiprocket.in/v1/external/courier/serviceability");
  url.searchParams.append("pickup_postcode", pickup_postcode);
  url.searchParams.append("delivery_postcode", delivery_postcode);
  url.searchParams.append("weight", weight);
  url.searchParams.append("cod", cod ? 1 : 0);
  url.searchParams.append("mode", mode);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`❌ Serviceability check failed: ${err}`);
  }

  const result = await res.json();
  return result;
}
