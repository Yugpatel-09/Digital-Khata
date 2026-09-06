import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { Customer, Transaction } from '../db';

export async function generateCustomerStatementPDF(
  customer: Customer,
  transactions: Transaction[],
  merchantName: string = 'Digital Khata'
): Promise<{ success: boolean; message?: string }> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Sort ascending chronologically to compute running balance
    const sortedTxns = [...transactions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let running = 0;
    let totalGave = 0;
    let totalGot = 0;

    const tableData = sortedTxns.map((t, index) => {
      if (t.type === 'GAVE') {
        running += t.amount;
        totalGave += t.amount;
      } else {
        running -= t.amount;
        totalGot += t.amount;
      }

      const isGave = t.type === 'GAVE';
      const balText = `Rs. ${Math.abs(running).toLocaleString('en-IN')} (${running > 0 ? 'Dr' : running < 0 ? 'Cr' : '0'})`;

      return [
        (index + 1).toString(),
        `${t.date}\n${t.time}`,
        t.notes || (isGave ? 'Credit purchase' : 'Payment received'),
        t.paymentMode || 'Cash',
        isGave ? `Rs. ${t.amount.toLocaleString('en-IN')}` : '-',
        !isGave ? `Rs. ${t.amount.toLocaleString('en-IN')}` : '-',
        balText
      ];
    });

    const netBalance = totalGave - totalGot;
    const isNetReceivable = netBalance > 0;
    const isNetPayable = netBalance < 0;

    // Header Background Banner
    doc.setFillColor(17, 19, 24);
    doc.rect(0, 0, pageWidth, 38, 'F');

    // Top Accent Line (Emerald)
    doc.setFillColor(16, 185, 129); // Emerald 500
    doc.rect(0, 0, pageWidth, 2.5, 'F');

    // Brand Header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(merchantName.toUpperCase(), 14, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(161, 161, 170);
    doc.text('OFFICIAL CUSTOMER LEDGER STATEMENT', 14, 22);
    doc.text(
      `Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      14,
      28
    );

    // Status Badge in Header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    if (isNetReceivable) {
      doc.setFillColor(5, 46, 22); // Emerald dark
      doc.roundedRect(pageWidth - 65, 10, 51, 18, 2, 2, 'F');
      doc.setTextColor(52, 211, 153); // Emerald light
      doc.text('YOU WILL GET (LEDA)', pageWidth - 60, 17);
      doc.text(`Rs. ${netBalance.toLocaleString('en-IN')}`, pageWidth - 60, 24);
    } else if (isNetPayable) {
      doc.setFillColor(69, 10, 10); // Red dark
      doc.roundedRect(pageWidth - 65, 10, 51, 18, 2, 2, 'F');
      doc.setTextColor(248, 113, 113); // Red light
      doc.text('YOU WILL GIVE (DENA)', pageWidth - 60, 17);
      doc.text(`Rs. ${Math.abs(netBalance).toLocaleString('en-IN')}`, pageWidth - 60, 24);
    } else {
      doc.setFillColor(39, 39, 42);
      doc.roundedRect(pageWidth - 65, 10, 51, 18, 2, 2, 'F');
      doc.setTextColor(212, 212, 216);
      doc.text('ACCOUNT SETTLED', pageWidth - 60, 17);
      doc.text('Rs. 0.00', pageWidth - 60, 24);
    }

    // Customer Info Card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 44, 90, 28, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(customer.name, 18, 52);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Phone: ${customer.phone || 'N/A'}`, 18, 58);
    doc.text(`Address: ${customer.address || 'N/A'}`, 18, 64);
    if (customer.notes) {
      doc.text(`Note: ${customer.notes}`, 18, 69);
    }

    // Summary Card
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(pageWidth - 94, 44, 80, 28, 2, 2, 'FD');

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    doc.text('Total Given (Debit / Udhaar):', pageWidth - 90, 52);
    doc.setTextColor(225, 29, 72);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${totalGave.toLocaleString('en-IN')}`, pageWidth - 20, 52, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Total Received (Credit / Jama):', pageWidth - 90, 58);
    doc.setTextColor(5, 150, 105);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${totalGot.toLocaleString('en-IN')}`, pageWidth - 20, 58, { align: 'right' });

    doc.setDrawColor(203, 213, 225);
    doc.line(pageWidth - 90, 61, pageWidth - 18, 61);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Closing Balance:', pageWidth - 90, 68);
    const closingColor = isNetReceivable ? [5, 150, 105] : isNetPayable ? [225, 29, 72] : [71, 85, 105];
    doc.setTextColor(closingColor[0], closingColor[1], closingColor[2]);
    doc.text(
      `Rs. ${Math.abs(netBalance).toLocaleString('en-IN')} ${isNetReceivable ? '(Due to you)' : isNetPayable ? '(You owe)' : '(Settled)'}`,
      pageWidth - 20,
      68,
      { align: 'right' }
    );

    // Table of Transactions
    autoTable(doc, {
      startY: 78,
      head: [['#', 'Date & Time', 'Particulars / Description', 'Mode', 'You Gave (Dr)', 'You Got (Cr)', 'Running Bal']],
      body: tableData,
      foot: [[
        '',
        'Total',
        `${sortedTxns.length} Transaction(s)`,
        '',
        `Rs. ${totalGave.toLocaleString('en-IN')}`,
        `Rs. ${totalGot.toLocaleString('en-IN')}`,
        `Rs. ${Math.abs(netBalance).toLocaleString('en-IN')} ${isNetReceivable ? 'Dr' : isNetPayable ? 'Cr' : ''}`
      ]],
      theme: 'grid',
      headStyles: {
        fillColor: [17, 19, 24],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'left'
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontSize: 9,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 28 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 20 },
        4: { cellWidth: 26, halign: 'right', textColor: [225, 29, 72], fontStyle: 'bold' },
        5: { cellWidth: 26, halign: 'right', textColor: [5, 150, 105], fontStyle: 'bold' },
        6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 14, right: 14 }
    });

    // Footer / Signature Section
    const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 12 : 200;

    if (finalY < pageHeight - 35) {
      doc.setDrawColor(203, 213, 225);
      doc.line(pageWidth - 65, finalY + 14, pageWidth - 14, finalY + 14);
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Authorized Signature / Stamp', pageWidth - 40, finalY + 19, { align: 'center' });
    }

    // Bottom Notice
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'This is a computer-generated ledger statement issued by Digital Khata Enterprise.',
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );

    const sanitizedName = customer.name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Statement_${sanitizedName}_${new Date().toISOString().split('T')[0]}.pdf`;

    if (Capacitor.isNativePlatform()) {
      // Native Android / iOS save and share
      const dataUri = doc.output('datauristring');
      const base64Data = dataUri.split(',')[1];

      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache
      });

      await Share.share({
        title: `${customer.name} - Ledger Statement`,
        text: `Digital Khata PDF Statement for ${customer.name}`,
        url: savedFile.uri,
        dialogTitle: 'Save or Share PDF Statement'
      });
      return { success: true };
    } else {
      // Web browser download
      doc.save(fileName);
      return { success: true };
    }
  } catch (error: any) {
    console.error('Failed to generate PDF statement', error);
    return { success: false, message: error?.message || 'Error creating PDF' };
  }
}
