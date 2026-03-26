import {
  checkServiceability,
  getShiprocketToken
} from "../services/shiprocketService.js";
import fetch from "node-fetch";
import { mapOrderToShiprocketPayload } from "../utils/shiprocketHelper.js";

export const getServiceability = async (req, res) => {
  try {
    const delivery_postcode = req.params.pincode;
    const pickup_postcode = process.env.SHIPROCKET_PICKUP_PINCODE;

    const data = await checkServiceability({
      pickup_postcode,
      delivery_postcode,
      weight: 0.5,
      cod: true,
    });

    const deliveryAvailable = data?.delivery_code?.delivery_available;
    const codAvailable = data?.delivery_code?.cod;
    const etd = data?.data?.available_courier_companies?.[0]?.etd || "N/A";

    res.status(200).json({
      success: true,
      estimatedDelivery: etd,
      courierOptions: data.data.available_courier_companies.map((c) => ({
        name: c.courier_name,
        deliveryDays: c.estimated_delivery_days,
        etd: c.etd,
        rate: c.rate,
        codCharges: c.cod_charges,
        rating: c.rating,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================================================
// 1. REGISTER ORDER ON SHIPROCKET
// =========================================================
export async function createShiprocketOrder(orderPayload) {
  const token = await getShiprocketToken();

  const response = await fetch(
    "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderPayload),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `❌ Shiprocket Order Creation failed: ${JSON.stringify(error)}`
    );
  }

  const data = await response.json();
  return data;
}

// =========================================================
// 2. ASSIGN AWB NUMBER TO SHIPMENT
// =========================================================
export async function assignAWB(shipmentId, courierId) {
  const token = await getShiprocketToken();

  const payload = {
    shipment_id: [shipmentId], 
    // courier_id: courierId,
  };

  const response = await fetch(
    "https://apiv2.shiprocket.in/v1/external/courier/assign/awb",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `❌ Shiprocket AWB Assignment failed: ${JSON.stringify(error)}`
    );
  }

  const data = await response.json();
  return data;
}

// =========================================================
// 4. GET SHIPMENT DETAILS
// =========================================================
export async function getShipmentDetails(shipmentId) {
  const token = await getShiprocketToken();

  const response = await fetch(
    `https://apiv2.shiprocket.in/v1/external/shipments/${shipmentId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `❌ Shiprocket Shipment Details failed: ${JSON.stringify(error)}`
    );
  }

  const data = await response.json();
  return data;
}
export async function scheduleShiprocketPickup(shipmentId) {
  const token = await getShiprocketToken();

  const payload = {
    shipment_id: [shipmentId], 
  };

  const response = await fetch(
    "https://apiv2.shiprocket.in/v1/external/courier/generate/pickup",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `❌ Shiprocket Pickup Scheduling failed: ${JSON.stringify(error)}`
    );
  }

  const data = await response.json();
  return data;
}


export const trackAWB = async (req, res) => {
  try {
    const awb = req.params.awb;
    if (!awb) {
      return res.status(400).json({ success: false, message: "AWB required" });
    }

    const token = await getShiprocketToken();

    const url = `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb}`;

    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const fallbackUrl = `https://apiv2.shiprocket.in/v1/external/awb/track?awb=${awb}`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        console.log("Fallback tracking data:", JSON.stringify(fallbackData, null, 2));
        return res.status(200).json({ success: true, data: fallbackData });
      }

      const errText = await response.text();
      console.error("Tracking API error:", errText);
      return res
        .status(400)
        .json({ success: false, message: "Failed to fetch tracking", err: errText });
    }

    const data = await response.json();
    console.log("Tracking API response:", JSON.stringify(data, null, 2));

   
    // const timeline =
    //   data?.data?.tracking_details ||
    //   data?.response?.tracking_details ||
    //   data?.tracking_details ||
    //   data?.data?.awb_data ||
    //   data?.data ||
    //   data; 

    // // Check if tracking data is empty
    // if (!timeline || (Array.isArray(timeline) && timeline.length === 0) || (timeline.activities && timeline.activities.length === 0)) {
    //   return res.status(200).json({ 
    //     success: true, 
    //     message: "Tracking data not available yet. The shipment may not have been picked up or is still in processing.", 
    //     tracking: [], 
    //     raw: data 
    //   });
    // }

    // aks
    const timeline =
  data?.tracking_data?.shipment_track_activities ||
  data?.data?.tracking_data?.shipment_track_activities ||
  [];

if (!timeline.length) {
  return res.status(200).json({
    success: true,
    message: "Tracking not available yet (not scanned by courier)",
    tracking: [],
    raw: data,
  });
}

    return res.status(200).json({ success: true, tracking: timeline, raw: data });
  } catch (error) {
    console.error("Track AWB error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};