import React, { useState, useEffect } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
const API_URL = 'https://banketuz-server.onrender.com/api'; // Serveringiz manzili
// const API_URL = "http://localhost:5000/api";
export default function BanquetOrderApp() {
  const [activeTab, setActiveTab] = useState("order");

  // Server Data States
  const [settings, setSettings] = useState({ phone: "", insta: "", addr: "" });
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  // Accordion open states
  const [openCategories, setOpenCategories] = useState({});

  // Form State (Order fields)
  const [formData, setFormData] = useState({
    cName: "",
    cPhone: "",
    cReason: "",
    cDate: "",
    cTime: "",
    cGuests: "",
    cOrg: "",
    cWishes: "",
    cPayDate: "",
    cPayMethod: "Наличные",
    cPayOther: "",
    cNotes: "",
  });

  // Quantities & Calculations State
  const [selectedSubCats, setSelectedSubCats] = useState({}); // { subCatId: qty }
  const [selectedServices, setSelectedServices] = useState({}); // { svcId: { qty: number, self: boolean } }
  const [discountPct, setDiscountPct] = useState(0);
  const [servicePct, setServicePct] = useState(20);
  const [prepayPct, setPrepayPct] = useState(0);

  // Admin state
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinErr, setPinErr] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Initial Fetch Data
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchSettings();
    // eslint-disable-next-line react-hooks/immutability
    fetchServices();
    // eslint-disable-next-line react-hooks/immutability
    fetchCategories();
    // eslint-disable-next-line react-hooks/immutability
    fetchSubCategories();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/settings/get`);
      const list = Array.isArray(data) ? data : data?.data || [];
      if (list.length > 0) setSettings(list[0]);
    } catch (err) {
      console.error("Settings yuklashda xatolik:", err);
    }
  };

  const fetchServices = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/defServices/get`);
      const list = Array.isArray(data) ? data : data?.data || [];
      setServices(list);
    } catch (err) {
      console.error("Services yuklashda xatolik:", err);
      setServices([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/categories/get`);
      const list = Array.isArray(data) ? data : data?.data || [];
      setCategories(list);
    } catch (err) {
      console.error("Categories yuklashda xatolik:", err);
      setCategories([]);
    }
  };

  const fetchSubCategories = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/sub-categories/get`);
      const list = Array.isArray(data) ? data : data?.data || [];
      setSubCategories(list);
    } catch (err) {
      console.error("SubCategories yuklashda xatolik:", err);
      setSubCategories([]);
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2500);
  };

  // Calculations Logic
  const calcSubtotal = () => {
    let sum = 0;
    if (!Array.isArray(subCategories)) return 0;
    subCategories.forEach((sub) => {
      const qty = selectedSubCats[sub._id] || 0;
      sum += qty * (parseFloat(sub.price) || 0);
    });
    return sum;
  };

  const calcServicesTotal = () => {
    let sum = 0;
    if (!Array.isArray(services)) return 0;
    services.forEach((svc) => {
      const state = selectedServices[svc._id] || { qty: 0, self: false };
      if (!state.self && state.qty > 0) {
        sum += state.qty * (parseFloat(svc.price) || 0);
      }
    });
    return sum;
  };

  const calcSelectedItemCount = () => {
    return Object.values(selectedSubCats).reduce((a, b) => a + b, 0);
  };

  const subtotal = calcSubtotal();
  const discountSum = (subtotal * (parseFloat(discountPct) || 0)) / 100;
  const afterDiscount = subtotal - discountSum;
  const guests = parseInt(formData.cGuests) || 0;
  const perPerson = guests > 0 ? Math.round(afterDiscount / guests) : 0;
  const servicesTotal = calcServicesTotal();
  const serviceSum = (afterDiscount * (parseFloat(servicePct) || 0)) / 100;
  const grandTotal = afterDiscount + servicesTotal + serviceSum;
  const prepaySum = (grandTotal * (parseFloat(prepayPct) || 0)) / 100;
  const remainingSum = grandTotal - prepaySum;
  // Handlers
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubQtyChange = (subId, qty) => {
    const parsedQty = Math.max(0, parseInt(qty) || 0);
    setSelectedSubCats((prev) => ({ ...prev, [subId]: parsedQty }));
  };

  const handleSvcQtyChange = (svcId, qty) => {
    const parsedQty = Math.max(0, parseInt(qty) || 0);
    setSelectedServices((prev) => ({
      ...prev,
      [svcId]: {
        ...prev[svcId],
        qty: parsedQty,
        self: parsedQty > 0 ? false : prev[svcId]?.self,
      },
    }));
  };

  const handleSvcSelfChange = (svcId, checked) => {
    setSelectedServices((prev) => ({
      ...prev,
      [svcId]: {
        ...prev[svcId],
        self: checked,
        qty: checked ? 0 : prev[svcId]?.qty,
      },
    }));
  };

  const toggleCategory = (id) => {
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleClearOrder = () => {
    if (
      !window.confirm("Hamma kiritilgan ma'lumotlarni tozalashni xohlaysizmi?")
    )
      return;
    setFormData({
      cName: "",
      cPhone: "",
      cReason: "",
      cDate: "",
      cTime: "",
      cGuests: "",
      cOrg: "",
      cWishes: "",
      cPayDate: "",
      cPayMethod: "Наличные",
      cPayOther: "",
      cNotes: "",
    });
    setSelectedSubCats({});
    setSelectedServices({});
    setDiscountPct(0);
    setServicePct(20);
    setPrepayPct(0);
  };

  // Admin Operations
  const checkPin = () => {
    if (pinInput === "1234" || pinInput === "7777") {
      setIsAdminUnlocked(true);
      setPinErr(false);
    } else {
      setPinErr(true);
    }
  };

  const saveSettings = async () => {
    try {
      const isEdit = Boolean(settings._id);
      const url = isEdit
        ? `${API_URL}/settings/edit/${settings._id}`
        : `${API_URL}/settings`;

      const res = isEdit
        ? await axios.put(url, settings)
        : await axios.post(url, settings);

      if (res.status === 200 || res.status === 201) {
        showToast("Sozlamalar saqlandi!");
        fetchSettings();
      }
    } catch (err) {
      alert(`Xatolik: ${err.response?.data?.message || err.message}`);
    }
  };

  const addService = async () => {
    const title = prompt("Yangi xizmat nomini kiriting:");
    if (!title) return;
    try {
      const res = await axios.post(`${API_URL}/defServices/add`, {
        title,
        price: "0",
      });
      if (res.status === 200 || res.status === 201) {
        showToast("Xizmat qo'shildi!");
        fetchServices();
      }
    } catch (err) {
      alert(`Xatolik: ${err.response?.data?.message || err.message}`);
    }
  };

  const updateService = async (id, title, price) => {
    try {
      await axios.put(`${API_URL}/defServices/edit/${id}`, { title, price });
      showToast("Xizmat yangilandi!");
      fetchServices();
    } catch (err) {
      alert(`Xatolik: ${err.response?.data?.message || err.message}`);
    }
  };

  const deleteService = async (id) => {
    if (!window.confirm("Haqiqatan ham o'chirmoqchimisiz?")) return;
    try {
      await axios.delete(`${API_URL}/defServices/delete/${id}`);
      showToast("O'chirildi!");
      fetchServices();
    } catch (err) {
      alert(`Xatolik: ${err.response?.data?.message || err.message}`);
    }
  };

  const addCategory = async () => {
    const smile = document.getElementById("newCatIcon").value || "🍽️";
    const title = document.getElementById("newCatName").value;
    if (!title) return alert("Bo'lim nomini kiriting!");

    try {
      const res = await axios.post(`${API_URL}/categories/add`, {
        smile,
        title,
      });
      if (res.status === 200 || res.status === 201) {
        document.getElementById("newCatName").value = "";
        showToast("Bo'lim qo'shildi!");
        fetchCategories();
      }
    } catch (err) {
      alert(`Xatolik: ${err.response?.data?.message || err.message}`);
    }
  };

  const updateCategory = async (id, smile, title) => {
    try {
      await axios.put(`${API_URL}/categories/edit/${id}`, { smile, title });
      showToast("Bo'lim yangilandi!");
      fetchCategories();
    } catch (err) {
      alert(`Xatolik: ${err.response?.data?.message || err.message}`);
    }
  };

  const deleteCategory = async (id) => {
    if (
      !window.confirm(
        "Ushbu bo'lim va uning barcha taomlari o'chiriladi. Rozimisiz?",
      )
    )
      return;
    try {
      await axios.delete(`${API_URL}/categories/delete/${id}`);
      showToast("Bo'lim o'chirildi!");
      fetchCategories();
      fetchSubCategories();
    } catch (err) {
      alert(`Xatolik: ${err.response?.data?.message || err.message}`);
    }
  };

  const addSubCategoryItem = async (catId) => {
    const title = prompt("Taom nomini kiriting:");
    if (!title) return;
    const price = prompt("Narxini kiriting (so'm):", "0");
    const size = prompt("Portsiya/Hajmi (masalan: порция, 1l):", "порция");

    try {
      const res = await axios.post(`${API_URL}/sub-categories/add`, {
        title,
        price: price || "0",
        size: size || "",
        category: catId,
        bor: true,
      });
      if (res.status === 200 || res.status === 201) {
        showToast("Taom qo'shildi!");
        fetchSubCategories();
      }
    } catch (err) {
      alert(`Xatolik: ${err.response?.data?.message || err.message}`);
    }
  };

  const updateSubCategoryItem = async (subId, fields) => {
    try {
      await await axios.put(`${API_URL}/sub-categories/edit/${subId}`, fields);
      showToast(`Taom yangilandi! `);
      fetchSubCategories();
    } catch (err) {
      alert(`Xatolik: ${err.response?.data?.message || err.message}`);
    }
  };

  const deleteSubCategoryItem = async (subId) => {
    if (!window.confirm("Taomni o'chirmoqchimisiz?")) return;
    try {
      await axios.delete(`${API_URL}/sub-categories/delete/${subId}`);
      showToast("Taom o'chirildi!");
      fetchSubCategories();
    } catch (err) {
      alert(`Xatolik: ${err.response?.data?.message || err.message}`);
    }
  };

  // PDF Download Action & Save Order
  const downloadPdf = async () => {
    setIsPdfLoading(true);

    // 1. Order ma'lumotlarini MongoDB-ga saqlash
    const orderData = {
      name: formData.cName,
      tel: formData.cPhone,
      type: formData.cReason,
      date: formData.cDate,
      startTime: formData.cTime,
      numberOfGuests: parseInt(formData.cGuests) || 0,
      organizationName: formData.cOrg,
      additionalInfo: formData.cWishes,
      subCategory: Object.keys(selectedSubCats).filter(
        (id) => selectedSubCats[id] > 0,
      ),
      additionalServices: services
        .map((svc) => ({
          title: svc.title,
          price: svc.price,
          amount: selectedServices[svc._id]?.qty || 0,
        }))
        .filter((s) => s.amount > 0),
      prepayment: {
        percent: parseFloat(prepayPct) || 0,
        amount: prepaySum,
        datePayment: formData.cPayDate,
        typePayment:
          formData.cPayMethod === "Другое"
            ? formData.cPayOther
            : formData.cPayMethod,
        lastAmount: remainingSum,
      },
      notes: formData.cNotes,
    };

    try {
      await axios.post(`${API_URL}/orders/add`, orderData);
    } catch (err) {
      console.error("Order saqlashda xatolik:", err);
    }

    const printContainer = document.getElementById("printableOrder");
    if (!printContainer) return;

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210 mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm

      const marginTop = 10;
      const marginBottom = 10;
      const marginX = 10;
      const contentWidth = pdfWidth - marginX * 2; // 190 mm

      let currentY = marginTop;

      // Ichki elementlarni tekshirish uchun barcha asosiy bloklar va tr-larni yig'amiz
      // p-brand-row, p-contact, p-band, p-fields, tr (jadval qatorlari), p-totals, p-signs
      const elementsToRender = [];

      Array.from(printContainer.children).forEach((child) => {
        if (child.tagName === "TABLE") {
          // Jadval bo'lsa, uning ichidagi Thead va har bir TR ni alohida element qilib olamiz
          const rows = child.querySelectorAll("tr");
          rows.forEach((row) => elementsToRender.push(row));
        } else {
          elementsToRender.push(child);
        }
      });

      for (let i = 0; i < elementsToRender.length; i++) {
        const el = elementsToRender[i];

        // Elementni rasmga aylantirish
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: printContainer.scrollWidth,
        });

        const imgData = canvas.toDataURL("image/png");
        const imgHeight = (canvas.height * contentWidth) / canvas.width;

        // Agar ushbu qator/element sahifaga sig'may qolsa -> Yangi sahifa ochamiz
        if (currentY + imgHeight > pdfHeight - marginBottom) {
          pdf.addPage();
          currentY = marginTop;
        }

        pdf.addImage(
          imgData,
          "PNG",
          marginX,
          currentY,
          contentWidth,
          imgHeight,
        );
        currentY += imgHeight;
      }

      const fileName = `Order_${(formData.cName || "Client").replace(/\s+/g, "_")}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("PDF yaratishda xatolik:", err);
      alert("PDF yuklashda xatolik yuz berdi!");
    } finally {
      setIsPdfLoading(false); // Har qanday holatda ham Loading-ni o'chirish
    }
  };

  return (
    <>
      {/* Toast Notification */}
      <div className={`save-toast ${toastMsg ? "show" : ""}`}>{toastMsg}</div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === "order" ? "active" : ""}`}
          onClick={() => setActiveTab("order")}
        >
          Заказ банкета
        </button>
        <button
          className={`tab-btn ${activeTab === "admin" ? "active" : ""}`}
          onClick={() => setActiveTab("admin")}
        >
          Admin panel
        </button>
      </div>

      {/* ================= ORDER VIEW ================= */}
      {activeTab === "order" && (
        <div className="wrap">
          <div className="doc-header">
            <div className="doc-header-top">
              <div className="brand">
                <span className="leaf">&#10087;</span>
                <div className="name">Ipak Yo'li</div>
                <div className="tag">BANQUET HALL</div>
              </div>
              <div className="doc-title">ЗАКАЗ БАНКЕТА</div>
            </div>
            <div className="contact-line">
              <span>&#9742;&#65039; Тел: {settings.phone || "—"}</span>
              <span>&#128247; Instagram: {settings.insta || "—"}</span>
              <span>&#128205; Манзил: {settings.addr || "—"}</span>
            </div>
          </div>

          <div className="section-band">1. ОСНОВНЫЕ ДАННЫЕ</div>
          <div className="field-grid">
            <div className="field">
              <label>Имя заказчика</label>
              <input
                type="text"
                id="cName"
                value={formData.cName}
                onChange={handleInputChange}
                placeholder="Ф.И.О."
              />
            </div>
            <div className="field">
              <label>Телефон</label>
              <input
                type="text"
                id="cPhone"
                value={formData.cPhone}
                onChange={handleInputChange}
                placeholder="+998 90 000 00 00"
              />
            </div>
            <div className="field">
              <label>Повод мероприятия</label>
              <input
                type="text"
                id="cReason"
                value={formData.cReason}
                onChange={handleInputChange}
                placeholder="Свадьба, юбилей, корпоратив..."
              />
            </div>
            <div className="field">
              <label>Дата мероприятия</label>
              <input
                type="date"
                id="cDate"
                value={formData.cDate}
                onChange={handleInputChange}
              />
            </div>
            <div className="field">
              <label>Время начала</label>
              <input
                type="time"
                id="cTime"
                value={formData.cTime}
                onChange={handleInputChange}
              />
            </div>
            <div className="field">
              <label>Количество гостей (чел.)</label>
              <input
                type="number"
                id="cGuests"
                min="1"
                value={formData.cGuests}
                onChange={handleInputChange}
                placeholder="например, 50"
              />
            </div>
            <div className="field full">
              <label>Экспертиза органи / Название организации</label>
              <input
                type="text"
                id="cOrg"
                value={formData.cOrg}
                onChange={handleInputChange}
                placeholder="При наличии"
              />
            </div>
            <div className="field full">
              <label>Доп. информация / пожелания</label>
              <textarea
                id="cWishes"
                value={formData.cWishes}
                onChange={handleInputChange}
                placeholder="Особые пожелания, аллергии и т.д."
              ></textarea>
            </div>
          </div>

          <div className="section-band">2. МЕНЮ БАНКЕТА</div>
          <div>
            {categories.map((cat) => {
              const catSubItems = subCategories.filter(
                (sub) => sub.category === cat._id,
              );
              const selectedCountInCat = catSubItems.reduce(
                (acc, item) => acc + (selectedSubCats[item._id] ? 1 : 0),
                0,
              );
              const isOpen = !!openCategories[cat._id];

              return (
                <div
                  key={cat._id}
                  className={`category ${isOpen ? "open" : ""}`}
                >
                  <div
                    className="category-head"
                    onClick={() => toggleCategory(cat._id)}
                  >
                    <div className="title">
                      <span className="icon">{cat.smile || "🍽️"}</span>
                      <h3>{cat.title}</h3>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        className={`count-badge ${selectedCountInCat > 0 ? "show" : ""}`}
                      >
                        {selectedCountInCat} turlar
                      </span>
                      <span className="chev">&#9660;</span>
                    </div>
                  </div>

                  <div className="category-body">
                    <div className="category-body-inner">
                      {catSubItems.map((sub, idx) => {
                        const qty = selectedSubCats[sub._id] || 0;
                        const price = parseFloat(sub.price) || 0;
                        const lineTotal = qty * price;

                        return (
                          <div key={sub._id} className="item-row">
                            <div className="item-name">
                              <span className="num">{idx + 1}.</span>
                              {sub.title}{" "}
                              {sub.size && (
                                <span
                                  style={{
                                    fontSize: "12px",
                                    color: "var(--ink-soft)",
                                  }}
                                >
                                  ({sub.size})
                                </span>
                              )}
                              {!sub.bor && (
                                <span className="neg-tag">Mavjud emas</span>
                              )}
                            </div>
                            <div className="item-price">
                              {price.toLocaleString()} сум
                            </div>
                            <div>
                              <input
                                type="text"
                                className="qty-input"
                                min="0"
                                value={qty || ""}
                                disabled={!sub.bor}
                                onChange={(e) =>
                                  handleSubQtyChange(sub._id, e.target.value)
                                }
                                placeholder="0"
                              />
                            </div>
                            <div className="line-total">
                              {lineTotal.toLocaleString()} сум
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="section-band">3. ДОПОЛНИТЕЛЬНЫЕ УСЛУГИ</div>
          <div className="services-wrap">
            <table className="services-table">
              <thead>
                <tr>
                  <th rowSpan="2" className="svc-name-col">
                    Наименование услуги
                  </th>
                  <th colSpan="3">Если организуем мы</th>
                  <th rowSpan="2" className="svc-self-col">
                    Клиент
                    <br />
                    сам
                  </th>
                </tr>
                <tr>
                  <th className="svc-sub">Кол-во</th>
                  <th className="svc-sub">Цена</th>
                  <th className="svc-sub">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {services.map((svc) => {
                  const svcState = selectedServices[svc._id] || {
                    qty: 0,
                    self: false,
                  };
                  const price = parseFloat(svc.price) || 0;
                  const sum = svcState.self ? 0 : svcState.qty * price;

                  return (
                    <tr key={svc._id}>
                      <td className="svc-name">{svc.title}</td>
                      <td>
                        <input
                          type="number"
                          className="svc-qty"
                          min="0"
                          disabled={svcState.self}
                          value={svcState.qty || ""}
                          onChange={(e) =>
                            handleSvcQtyChange(svc._id, e.target.value)
                          }
                          placeholder="0"
                        />
                      </td>
                      <td className="svc-price">
                        {price.toLocaleString()} сум
                      </td>
                      <td className="svc-sum">{sum.toLocaleString()} сум</td>
                      <td>
                        <input
                          type="checkbox"
                          className="svc-self-chk"
                          checked={!!svcState.self}
                          onChange={(e) =>
                            handleSvcSelfChange(svc._id, e.target.checked)
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="section-band">4. УСЛОВИЯ ОПЛАТЫ</div>
          <div className="field-grid">
            <div className="field">
              <label>Предоплата, %</label>
              <input
                type="number"
                id="prepayPct"
                min="0"
                max="100"
                value={prepayPct}
                onChange={(e) => setPrepayPct(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="field">
              <label>Предоплата, сум (авто)</label>
              <div className="readout">{prepaySum.toLocaleString()} сум</div>
            </div>
            <div className="field">
              <label>Дата оплаты</label>
              <input
                type="date"
                id="cPayDate"
                value={formData.cPayDate}
                onChange={handleInputChange}
              />
            </div>
            <div className="field">
              <label>Способ оплаты</label>
              <select
                id="cPayMethod"
                value={formData.cPayMethod}
                onChange={handleInputChange}
              >
                <option value="Наличные">Наличные</option>
                <option value="Пластиковая карта">Пластиковая карта</option>
                <option value="Банковский перевод">Банковский перевод</option>
                <option value="Смешанный (наличные + карта)">
                  Смешанный (наличные + карта)
                </option>
                <option value="Другое">Другое</option>
              </select>
            </div>
            {formData.cPayMethod === "Другое" && (
              <div className="field full">
                <label>Способ оплаты (уточните)</label>
                <input
                  type="text"
                  id="cPayOther"
                  value={formData.cPayOther}
                  onChange={handleInputChange}
                  placeholder="Уточните способ оплаты"
                />
              </div>
            )}
            <div className="field full">
              <label>Оставшаяся сумма (авто)</label>
              <div className="readout">{remainingSum.toLocaleString()} сум</div>
            </div>
          </div>

          <div className="section-band">5. ПРИМЕЧАНИЯ</div>
          <div className="field-grid">
            <div className="field full">
              <textarea
                id="cNotes"
                value={formData.cNotes}
                onChange={handleInputChange}
                placeholder="Дополнительные примечания менеджера или заказчика"
              ></textarea>
            </div>
          </div>

          <div className="totals-box">
            <div className="totals-row">
              <span className="lbl">Итого по меню</span>
              <span className="val">{subtotal.toLocaleString()} сум</span>
            </div>
            <div className="totals-row">
              <span className="lbl">
                Скидка, %
                <input
                  type="number"
                  className="mini-input"
                  min="0"
                  max="100"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                />
              </span>
              <span className="val">{discountSum.toLocaleString()} сум</span>
            </div>
            <div className="totals-row">
              <span className="lbl">Итого по меню (со скидкой)</span>
              <span className="val">{afterDiscount.toLocaleString()} сум</span>
            </div>
            <div className="totals-row">
              <span className="lbl">Итого по меню на 1 человека</span>
              <span className="val">{perPerson.toLocaleString()} сум</span>
            </div>
            <div className="totals-row">
              <span className="lbl">Итого по услугам</span>
              <span className="val">{servicesTotal.toLocaleString()} сум</span>
            </div>
            <div className="totals-row">
              <span className="lbl">
                Обслуживание, %
                <input
                  type="number"
                  className="mini-input"
                  min="0"
                  max="100"
                  value={servicePct}
                  onChange={(e) => setServicePct(e.target.value)}
                />
              </span>
              <span className="val">{serviceSum.toLocaleString()} сум</span>
            </div>
            <div className="totals-final">
              <span className="lbl">ИТОГО К ОПЛАТЕ</span>
              <span className="val">{grandTotal.toLocaleString()} сум</span>
            </div>
          </div>

          <div className="doc-footer">
            <div className="thanks">&#9825; Спасибо, что выбрали нас!</div>
            <div className="thanks2">Мы сделаем ваш праздник незабываемым!</div>
            <div className="sign-row" style={{ paddingTop: "10px" }}>
              <div className="sign">Подпись заказчика</div>
              <div className="sign">Подпись менеджера</div>
            </div>
            <div className="final-leaf">
              <span className="leaf">&#10087;</span>
            </div>
          </div>
        </div>
      )}

      {/* ================= ADMIN VIEW ================= */}
      {activeTab === "admin" && (
        <div className="wrap">
          {!isAdminUnlocked ? (
            <div className="admin-gate">
              <h2>Admin panel</h2>
              <p>Davom etish uchun kirish kodini kiriting</p>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••"
                maxLength="12"
              />
              {pinErr && (
                <div className="err" style={{ display: "block" }}>
                  Kod noto'g'ri, qaytadan urinib ko'ring
                </div>
              )}
              <button
                className="btn btn-gold"
                style={{ width: "100%" }}
                onClick={checkPin}
              >
                Kirish
              </button>
            </div>
          ) : (
            <div>
              <div className="admin-toolbar">
                <div>
                  <h2>Menyuni boshqarish</h2>
                  <div className="sub">
                    O'zgarishlar saqlangach barcha mijozlarga darhol ko'rinadi
                  </div>
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ color: "#6d5620", borderColor: "#6d5620" }}
                  onClick={() => setIsAdminUnlocked(false)}
                >
                  Chiqish
                </button>
              </div>

              <div className="admin-settings">
                <h4>Restoran ma'lumotlari (hujjat sarlavhasida ko'rinadi)</h4>
                <div className="grid3">
                  <input
                    type="text"
                    value={settings.phone || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, phone: e.target.value })
                    }
                    onBlur={saveSettings}
                    placeholder="Тел: +998 90 000 00 00"
                  />
                  <input
                    type="text"
                    value={settings.insta || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, insta: e.target.value })
                    }
                    onBlur={saveSettings}
                    placeholder="Instagram: @ipakyoli"
                  />
                  <input
                    type="text"
                    value={settings.addr || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, addr: e.target.value })
                    }
                    onBlur={saveSettings}
                    placeholder="Манзил: Тошкент ш., ..."
                  />
                </div>
              </div>

              {/* Admin DefServices Block */}
              <div className="admin-cat">
                <div className="admin-cat-head">
                  <input
                    type="text"
                    className="name-input"
                    value="Qo'shimcha xizmatlar narxlari"
                    disabled
                    style={{ opacity: 0.8 }}
                  />
                </div>
                <div>
                  {services.map((svc) => (
                    <div key={svc._id} className="admin-service-row">
                      <input
                        type="text"
                        defaultValue={svc.title}
                        onBlur={(e) =>
                          updateService(svc._id, e.target.value, svc.price)
                        }
                      />
                      <input
                        type="number"
                        defaultValue={svc.price}
                        onBlur={(e) =>
                          updateService(svc._id, svc.title, e.target.value)
                        }
                      />
                      <div />
                      <button
                        className="icon-btn danger"
                        onClick={() => deleteService(svc._id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="admin-add-row">
                  <button className="btn btn-gold" onClick={addService}>
                    + Xizmat qo'shish
                  </button>
                </div>
              </div>

              {/* Admin Categories & SubCategories Block */}
              <div className="admin-new-cat">
                <input
                  type="text"
                  className="icon-new"
                  id="newCatIcon"
                  placeholder="🍽️"
                  maxLength="4"
                />
                <input
                  type="text"
                  id="newCatName"
                  placeholder="Yangi bo'lim nomi (masalan, ICHIMLIKLAR)"
                />
                <button className="btn btn-gold" onClick={addCategory}>
                  + Bo'lim qo'shish
                </button>
              </div>

              <div>
                {categories.map((cat) => {
                  const catSubItems = subCategories.filter(
                    (sub) => sub.category === cat._id,
                  );

                  return (
                    <div key={cat._id} className="admin-cat">
                      <div className="admin-cat-head">
                        <input
                          type="text"
                          className="icon-input"
                          defaultValue={cat.smile || "🍽️"}
                          onBlur={(e) =>
                            updateCategory(cat._id, e.target.value, cat.title)
                          }
                        />
                        <input
                          type="text"
                          className="name-input"
                          defaultValue={cat.title}
                          onBlur={(e) =>
                            updateCategory(cat._id, cat.smile, e.target.value)
                          }
                        />
                        <button
                          className="icon-btn danger"
                          onClick={() => deleteCategory(cat._id)}
                        >
                          Bo'limni o'chirish
                        </button>
                      </div>

                      <div>
                        {catSubItems.map((sub) => (
                          <div key={sub._id} className="admin-item-row">
                            <input
                              type="text"
                              defaultValue={sub.title}
                              onBlur={(e) =>
                                updateSubCategoryItem(sub._id, {
                                  title: e.target.value,
                                })
                              }
                            />
                            <input
                              type="text"
                              defaultValue={sub.size || ""}
                              placeholder="Hajmi"
                              onBlur={(e) =>
                                updateSubCategoryItem(sub._id, {
                                  size: e.target.value,
                                })
                              }
                            />
                            <input
                              type="number"
                              defaultValue={sub.price}
                              onBlur={(e) =>
                                updateSubCategoryItem(sub._id, {
                                  price: e.target.value,
                                })
                              }
                            />
                            <button
                              className="icon-btn danger"
                              onClick={() => deleteSubCategoryItem(sub._id)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="admin-add-row">
                        <button
                          className="btn btn-gold"
                          onClick={() => addSubCategoryItem(cat._id)}
                        >
                          + Taom (SubCategory) qo'shish
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= SUMMARY BAR ================= */}
      {activeTab === "order" && (
        <div className="summary-bar">
          <div className="summary-inner">
            <div className="summary-total">
              <div className="label">
                <span>{calcSelectedItemCount()}</span> ta taom &middot; ИТОГО К
                ОПЛАТЕ
              </div>
              <div className="amount">{grandTotal.toLocaleString()} сум</div>
            </div>
            <div className="summary-actions">
              <button className="btn btn-ghost" onClick={handleClearOrder}>
                Tozalash
              </button>
              <button
                onClick={downloadPdf}
                disabled={isPdfLoading}
                className="pdf-btn"
              >
                {isPdfLoading ? (
                  <>
                    <span>PDF Tayyorlanmoqda...</span>
                  </>
                ) : (
                  <span>Скачать PDF</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Printable Template for PDF export */}
      <div id="printableOrder">
        <div className="p-brand-row">
          <div className="p-brand">
            <span className="leaf">&#10087;</span>
            <div className="name">Ipak Yo'li</div>
            <div className="tag">BANQUET HALL</div>
          </div>
          <div className="p-title">ЗАКАЗ БАНКЕТА</div>
        </div>
        <div className="p-contact">
          Тел: {settings.phone || "—"} &nbsp;|&nbsp; Instagram:{" "}
          {settings.insta || "—"} &nbsp;|&nbsp; Манзил: {settings.addr || "—"}
        </div>

        <div className="p-band">1. ОСНОВНЫЕ ДАННЫЕ</div>
        <div className="p-fields">
          <div>
            <span className="k">Имя заказчика: </span>
            <span className="v">{formData.cName}</span>
          </div>
          <div>
            <span className="k">Телефон: </span>
            <span className="v">{formData.cPhone}</span>
          </div>
          <div>
            <span className="k">Повод: </span>
            <span className="v">{formData.cReason}</span>
          </div>
          <div>
            <span className="k">Дата / Время: </span>
            <span className="v">
              {formData.cDate} / {formData.cTime}
            </span>
          </div>
          <div>
            <span className="k">Количество гостей: </span>
            <span className="v">{formData.cGuests} чел.</span>
          </div>
          <div>
            <span className="k">Организация: </span>
            <span className="v">{formData.cOrg}</span>
          </div>
          <div className="full">
            <span className="k">Пожелания: </span>
            <span className="v">{formData.cWishes}</span>
          </div>
        </div>

        <div className="p-band">2. МЕНЮ БАНКЕТА</div>
        <table>
          <thead>
            <tr>
              <th>Наименование</th>
              <th className="num">Кол-во</th>
              <th className="num">Цена</th>
              <th className="num">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => {
              const catSubs = subCategories.filter(
                (s) =>
                  s.category === cat._id && (selectedSubCats[s._id] || 0) > 0,
              );
              if (catSubs.length === 0) return null;
              return (
                <React.Fragment key={cat._id}>
                  <tr className="p-cat-row">
                    <td colSpan="4">
                      {cat.smile} {cat.title}
                    </td>
                  </tr>
                  {catSubs.map((sub) => {
                    const qty = selectedSubCats[sub._id];
                    const price = parseFloat(sub.price) || 0;
                    return (
                      <tr key={sub._id}>
                        <td>
                          {sub.title} {sub.size ? `(${sub.size})` : ""}
                        </td>
                        <td className="num">{qty}</td>
                        <td className="num">{price.toLocaleString()}</td>
                        <td className="num">
                          {(qty * price).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        <div className="p-band">3. ДОПОЛНИТЕЛЬНЫЕ УСЛУГИ</div>
        <table>
          <thead>
            <tr>
              <th>Услуга</th>
              <th className="num">Кол-во / Статус</th>
              <th className="num">Цена</th>
              <th className="num">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {services.map((svc) => {
              const st = selectedServices[svc._id];
              if (!st || (!st.self && !st.qty)) return null;
              const price = parseFloat(svc.price) || 0;
              return (
                <tr key={svc._id}>
                  <td>{svc.title}</td>
                  <td className="num">{st.self ? "Клиент сам" : st.qty}</td>
                  <td className="num">
                    {st.self ? "-" : price.toLocaleString()}
                  </td>
                  <td className="num">
                    {st.self ? "0" : (st.qty * price).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="p-totals">
          <div className="p-trow">
            <span>Итого по меню:</span>
            <span className="v">{subtotal.toLocaleString()} сум</span>
          </div>
          <div className="p-trow">
            <span>Скидка ({discountPct}%):</span>
            <span className="v">{discountSum.toLocaleString()} сум</span>
          </div>
          <div className="p-trow">
            <span>Итого по 1 чел:</span>
            <span className="v">{perPerson.toLocaleString()} сум</span>
          </div>
          <div className="p-trow">
            <span>Обслуживание ({servicePct}%):</span>
            <span className="v">{serviceSum.toLocaleString()} сум</span>
          </div>
          <div className="p-trow">
            <span>Предоплата ({prepayPct}%):</span>
            <span className="v">{prepaySum.toLocaleString()} сум</span>
          </div>
          <div className="p-final">
            <span>ИТОГО К ОПЛАТЕ:</span>
            <span>{grandTotal.toLocaleString()} сум</span>
          </div>
        </div>

        <div className="p-footer">
          <div>♡ Спасибо, что выбрали нас!</div>
          <div className="t2">Мы сделаем ваш праздник незабываемым!</div>
        </div>
        <div className="p-signs">
          <div>Подпись заказчика</div>
          <div>Подпись менеджера</div>
        </div>
      </div>
    </>
  );
}
