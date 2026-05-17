/**
 * ================================================================
 * 📁 weatherService.js
 * ================================================================
 * 
 * 🎯 الهدف من هذا الملف:
 * جلب بيانات الطقس من خدمة OpenWeatherMap API
 * بناءً على إحداثيات الموقع (خط الطول وخط العرض)
 * 
 * 📌 الاستخدام: تستخدم هذه البيانات لتعديل أولوية البلاغات
 *    - عند هطول المطر → زيادة أولوية مشاكل تصريف المياه
 *    - عند العواصف الرعدية → زيادة أولوية جميع البلاغات
 * 
 * ================================================================
 */

// استيراد مكتبة fetch للقيام بطلبات HTTP (مطلوب في بيئة Node.js)
// ملاحظة: في المتصفح (Frontend) هذا السطر ليس ضرورياً، ولكن في الخادم (Backend) تحتاجه
import fetch from "node-fetch";

/**
 * 🌤️ دالة جلب حالة الطقس من OpenWeatherMap API
 * 
 * @param {number} lat - خط العرض (Latitude)
 * @param {number} lng - خط الطول (Longitude)
 * @returns {Promise<string>} - حالة الطقس (Rain, Clear, Clouds, Thunderstorm, Unknown)
 * 
 * @example
 * const weather = await getWeather(23.5889, 58.3829); // مسقط
 * console.log(weather); // "Clear" أو "Rain" أو "Unknown"
 */
export async function getWeather(lat, lng) {
  try {
    // 🔑 الحصول على مفتاح API من متغيرات البيئة
    // ملاحظة: تأكد من أن اسم المتغير صحيح في ملف .env
    const API_KEY = process.env.REACT_APP_API_KEY;

    // ✅ التحقق من وجود الإحداثيات
    if (!lat || !lng) {
      console.warn("⚠️ Missing coordinates (lat or lng)");
      return "Unknown";
    }

    // 🌐 بناء رابط API
    // OpenWeatherMap API: https://openweathermap.org/current
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${API_KEY}`;
    
    // 📡 إرسال الطلب إلى الخادم
    const res = await fetch(url);

    // ❌ التحقق من نجاح الطلب (status 200)
    if (!res.ok) {
      console.error(`❌ Weather API error: ${res.status} ${res.statusText}`);
      return "Unknown";
    }

    // 📦 تحويل الاستجابة إلى JSON
    const data = await res.json();

    // 🌦️ استخراج حالة الطقس الرئيسية
    // البيانات تأتي بصيغة: { weather: [{ main: "Rain" }] }
    const weatherCondition = data.weather?.[0]?.main || "Clear";

    // 🖨️ طباعة الحالة في السجل (للتتبع)
    console.log(`🌤️ Weather at (${lat}, ${lng}): ${weatherCondition}`);

    return weatherCondition;

  } catch (err) {
    // 🚨 معالجة أي خطأ في الاتصال أو التحليل
    console.error("❌ Weather Service Error:", err.message);
    return "Unknown";
  }
}