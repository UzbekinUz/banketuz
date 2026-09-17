import { useEffect, useState } from "react";
import axios from "axios";
import "./list.css";

function Orderr() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter va Search uchun state'lar
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("all");

  const API_URL = "https://banketuz-server.onrender.com/api/orders";
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/get`);
      setOrders(response.data.data || response.data);
    } catch (err) {
      console.error("Buyurtmalarni yuklashda xatolik:", err);
      setError("Buyurtmalarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  // O'chirish funksiyasi
  const handleDelete = async (id) => {
    const isConfirmed = window.confirm(
      "Haqiqatan ham ushbu buyurtmani o'chirmoqchimisiz?",
    );

    if (isConfirmed) {
      try {
        await axios.delete(`${API_URL}/delete/${id}`);
        // Frontend'dagi ro'yxatdan ham darhol o'chiramiz
        setOrders(orders.filter((order) => order._id !== id));
      } catch (err) {
        console.error("O'chirishda xatolik:", err);
        alert("Buyurtmani o'chirishda xatolik yuz berdi!");
      }
    }
  };

  // Statelar
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const filteredOrders = orders.filter((order) => {
    const name = (order.name || "").toLowerCase();
    const phone = (order.tel || "").toLowerCase();
    const matchesSearch =
      name.includes(searchTerm.toLowerCase()) || phone.includes(searchTerm);

    const matchesType =
      selectedEventType === "all" || order.eventType === selectedEventType;

    // ISO sanadan YYYY-MM-DD qismini ajratish va sonlarga o'tkazish
    let matchesDay = true;
    let matchesMonth = true;
    let matchesYear = true;

    if (order.date) {
      const [year, month, day] = order.date
        .split("T")[0]
        .split("-")
        .map(Number);

      matchesDay = !selectedDay || day === Number(selectedDay);
      matchesMonth = !selectedMonth || month === Number(selectedMonth);
      matchesYear = !selectedYear || year === Number(selectedYear);
    } else if (selectedDay || selectedMonth || selectedYear) {
      // Agar buyurtmada sana bo'lmasa va filter tanlangan bo'lsa
      return false;
    }

    return (
      matchesSearch && matchesType && matchesDay && matchesMonth && matchesYear
    );
  });

  if (loading) return <div className="loading">Buyurtmalar yuklanmoqda...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="orders-container">
      <div className="orders-header">
        <h2>Buyurtmalar ro'yxati</h2>
        <button className="refresh-btn" onClick={fetchOrders}>
          🔄 Yangilash
        </button>
      </div>

      {/* Filter va Qidiruv Paneli */}
      <div
        className="filter-panel"
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        {/* Qidiruv inputi */}
        <input
          type="text"
          placeholder="Ism yoki telefon bo'yicha qidiruv..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            flex: 1,
            minWidth: "200px",
          }}
        />

        {/* Tadbir turi bo'yicha filter */}
        <select
          value={selectedEventType}
          onChange={(e) => setSelectedEventType(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        >
          <option value="all">Barcha tadbirlar</option>
          <option value="Свадьба">Свадьба</option>
          <option value="Юбилей">Юбилей</option>
          <option value="Корпоратив">Корпоратив</option>
        </select>

        {/* Kun bo'yicha filter */}
        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        >
          <option value="">Kun (Barchasi)</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* Oy bo'yicha filter */}
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        >
          <option value="">Oy (Barchasi)</option>
          {[
            "Yanvar",
            "Fevral",
            "Mart",
            "Aprel",
            "May",
            "Iyun",
            "Iyul",
            "Avgust",
            "Sentabr",
            "Oktabr",
            "Noyabr",
            "Dekabr",
          ].map((monthName, index) => (
            <option key={index + 1} value={index + 1}>
              {monthName}
            </option>
          ))}
        </select>

        {/* Yil bo'yicha filter */}
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        >
          <option value="">Yil (Barchasi)</option>
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        {/* Barcha filterlarni tozalash tugmasi */}
        {(selectedDay ||
          selectedMonth ||
          selectedYear ||
          searchTerm ||
          selectedEventType !== "all") && (
          <button
            onClick={() => {
              setSelectedDay("");
              setSelectedMonth("");
              setSelectedYear("");
              setSearchTerm("");
              setSelectedEventType("all");
            }}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #ff4d4f",
              backgroundColor: "#fff1f0",
              color: "#ff4d4f",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            ✖ Tozalash
          </button>
        )}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="empty-state">Hech qanday buyurtma topilmadi</div>
      ) : (
        <div className="orders-grid">
          {filteredOrders.map((order, index) => (
            <div key={order._id || index} className="order-card">
              <div className="order-card-header">
                <span className="order-id">#{index + 1}</span>
                <span className="order-date">
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString()
                    : "Sana ko'rsatilmagan"}
                </span>
              </div>

              <div className="order-card-body">
                <div className="order-field">
                  <label>Mijoz (Ф.И.О.):</label>
                  <span>{order.name}</span>
                </div>

                <div className="order-field">
                  <label>Telefon:</label>
                  <a href={`tel:${order.tel}`}>{order.tel || "-"}</a>
                </div>

                <div className="order-field">
                  <label>Tadbirlar turi (Повод):</label>
                  <span>{order.type || "-"}</span>
                </div>

                <div className="order-field">
                  <label>Boshlanish vaqti:</label>
                  <span>{order.startTime || "-"}</span>
                </div>

                <div className="order-field">
                  <label>Mehmonlar soni:</label>
                  <span>
                    {order.numberOfGuests
                      ? `${order.numberOfGuests} kishi`
                      : "-"}
                  </span>
                </div>

                {order.organization && (
                  <div className="order-field">
                    <label>Ekspertiza / Tashkilot:</label>
                    <span>{order.organizationName}</span>
                  </div>
                )}

                {order.notes && (
                  <div className="order-field full-width">
                    <label>Qo'shimcha ma'lumot / Tilaklar:</label>
                    <p className="notes-text">{order.notes}</p>
                  </div>
                )}

                {/* O'chirish tugmasi */}
                <button
                  onClick={() => handleDelete(order._id)}
                  style={{
                    marginTop: "12px",
                    padding: "6px 12px",
                    backgroundColor: "#ff4d4f",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  🗑 O'chirish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Orderr;
