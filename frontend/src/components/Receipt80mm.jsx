import React, { forwardRef } from "react";
import { useTheme } from "../context/ThemeContext";
import Barcode128 from "./Barcode128";

const Receipt80mm = forwardRef(({ bill, onAfterPrint }, ref) => {
  const { storeSettings } = useTheme();

  if (!bill) return null;

  const items = bill.salesItems || [];
  const currencySymbol = storeSettings?.currencySymbol || storeSettings?.currency || "Rs.";
  const is58mm = storeSettings?.receiptWidth === "58mm";
  const showBarcode = storeSettings?.receiptShowBarcode !== false;
  const showDiscounts = storeSettings?.receiptShowDiscounts !== false;

  return (
    <div
      ref={ref}
      id="receipt80mm"
      className={`bg-white text-black font-mono shadow-none print:shadow-none print:w-full mx-auto ${
        is58mm 
          ? "w-[58mm] max-w-[58mm] p-2 text-[10px]" 
          : "w-[80mm] max-w-[80mm] p-4 text-xs"
      }`}
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
    >
      {/* Store Header */}
      <div className="text-center pb-2 border-b border-dashed border-black">
        {storeSettings?.logoUrl && (
          <div className="flex justify-center mb-1">
            <img 
              src={storeSettings.logoUrl} 
              alt={storeSettings?.storeName || "Logo"} 
              className="h-10 max-w-[140px] object-contain"
            />
          </div>
        )}
        <h1 className={`${is58mm ? "text-sm" : "text-base"} font-bold uppercase tracking-tight`}>
          {storeSettings?.storeName || "Universal POS & Mart"}
        </h1>
        {storeSettings?.tagline && (
          <p className="text-[10px] text-gray-700">{storeSettings.tagline}</p>
        )}
        {storeSettings?.address && (
          <p className="text-[10px] text-gray-700 mt-0.5">{storeSettings.address}</p>
        )}
        {storeSettings?.phone && (
          <p className="text-[10px] font-semibold text-gray-900">Tel: {storeSettings.phone}</p>
        )}
        {storeSettings?.receiptHeaderNotice && (
          <div className="mt-1 inline-block border border-dashed border-gray-400 px-2 py-0.5 text-[9.5px] uppercase font-bold text-gray-800">
            {storeSettings.receiptHeaderNotice}
          </div>
        )}
      </div>

      {/* Bill & Customer Meta */}
      <div className="py-2 border-b border-dashed border-black text-[11px] space-y-0.5">
        <div className="flex justify-between font-bold">
          <span>Bill #: {bill.billID}</span>
          <span>{bill.formattedTime || new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span>Date: {bill.formattedDate || new Date(bill.createdAt).toLocaleDateString()}</span>
          <span>Mode: {bill.paymentMethod || "Cash"}</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span className="truncate max-w-[170px]" title={bill.customerName || "Walk-in Customer"}>
            Customer: {bill.customerName || "Walk-in Customer"}
          </span>
          {bill.customerPhone && <span>Ph: {bill.customerPhone}</span>}
        </div>
        {bill.agentId?.name && (
          <div className="text-[10px] text-gray-600">
            Agent: {bill.agentId.name}
          </div>
        )}
      </div>

      {/* Itemized Table */}
      <div className="py-2 border-b border-dashed border-black">
        <div className="grid grid-cols-12 text-[10px] font-bold uppercase pb-1 border-b border-gray-300">
          <span className={is58mm ? "col-span-5" : "col-span-6"}>Item</span>
          <span className={is58mm ? "col-span-3 text-center" : "col-span-2 text-center"}>Qty</span>
          <span className="col-span-2 text-right">Rate</span>
          <span className={is58mm ? "col-span-2 text-right" : "col-span-2 text-right"}>Total</span>
        </div>

        <div className="divide-y divide-dotted divide-gray-200 py-1">
          {items.map((it, idx) => {
            const actualQty = (it.quantitySold || it.quantity || 1) - (it.refundQuantity || 0);
            const rate = it.rate || 0;
            const lineTotal = actualQty * rate;

            return (
              <div key={idx} className="grid grid-cols-12 text-[10.5px] py-1">
                <div className={`${is58mm ? "col-span-5" : "col-span-6"} pr-1`}>
                  <div className="font-semibold leading-tight">{it.itemName}</div>
                  {it.colourName && <span className="text-[9px] text-gray-600">({it.colourName})</span>}
                  {it.conversionFactor > 1 && (
                    <span className="text-[8.5px] text-gray-500 block">
                      ({it.conversionFactor}x base)
                    </span>
                  )}
                  {it.refundQuantity > 0 && (
                    <span className="text-[9px] text-red-600 font-bold block">
                      Ref: -{it.refundQuantity}
                    </span>
                  )}
                </div>
                <div className={`${is58mm ? "col-span-3" : "col-span-2"} text-center`}>
                  {actualQty} {it.unit || "pcs"}
                </div>
                <div className="col-span-2 text-right">
                  {rate.toFixed(0)}
                </div>
                <div className="col-span-2 text-right font-bold">
                  {lineTotal.toFixed(0)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Totals Summary */}
      <div className="py-2 border-b border-dashed border-black text-[11px] space-y-1">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{currencySymbol} {(bill.subtotal || bill.grandTotal || 0).toFixed(2)}</span>
        </div>

        {showDiscounts && bill.discountAmount > 0 && (
          <div className="flex justify-between text-gray-700">
            <span>Discount:</span>
            <span>-{currencySymbol} {bill.discountAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-300">
          <span>GRAND TOTAL:</span>
          <span>{currencySymbol} {(bill.grandTotal || 0).toFixed(2)}</span>
        </div>

        {bill.splitPayment?.isSplit && (
          <div className="pt-1 mt-1 border-t border-dashed border-gray-300 text-[10.5px]">
            <div className="flex justify-between font-semibold text-gray-800">
              <span>Payment Breakdown:</span>
              <span>Split</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>• Cash:</span>
              <span>{currencySymbol} {(bill.splitPayment.cashAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>• {bill.splitPayment.bankProvider || "Bank / Card"}:</span>
              <span>{currencySymbol} {(bill.splitPayment.bankAmount || 0).toFixed(2)}</span>
            </div>
          </div>
        )}

        {bill.cashReceived > 0 && (
          <>
            <div className="flex justify-between text-gray-700 pt-0.5">
              <span>Cash Tendered:</span>
              <span>{currencySymbol} {bill.cashReceived.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Change Due:</span>
              <span>{currencySymbol} {(bill.changeDue || 0).toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      {/* Barcode & Footers */}
      <div className="text-center pt-2 space-y-1">
        {showBarcode && (
          <div className="flex justify-center my-1">
            <Barcode128 
              value={bill.billID} 
              height={is58mm ? 28 : 36} 
              width={is58mm ? 1.0 : 1.2} 
              showText={true} 
            />
          </div>
        )}

        <p className="font-bold text-[11px] text-gray-800 mt-2">
          {storeSettings?.receiptFooter || "Thank You! Visit Again"}
        </p>

        <p className="font-urdu text-xs text-gray-800 leading-normal mt-1">
          {storeSettings?.urduFooterNotice || "بل کے بغیر مال تبدیل یا واپس نہیں ہوگا"}
        </p>

        <p className="text-[8px] text-gray-400 mt-1">
          Powered by Universal Mart & POS System
        </p>
      </div>
    </div>
  );
});

export default Receipt80mm;
