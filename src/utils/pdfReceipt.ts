import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export function showPdfToast(message: string, isError = false) {
  try {
    const existing = document.getElementById('pdf-download-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'pdf-download-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.zIndex = '999999';
    toast.style.maxWidth = '360px';
    toast.style.width = '90%';
    toast.style.padding = '12px 16px';
    toast.style.borderRadius = '12px';
    toast.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)';
    toast.style.background = isError ? '#881337' : '#0f172a';
    toast.style.color = isError ? '#ffe4e6' : '#6ee7b7';
    toast.style.border = isError ? '1px solid #f43f5e' : '1px solid #10b981';
    toast.style.fontSize = '12px';
    toast.style.fontFamily = 'sans-serif';
    toast.style.fontWeight = 'bold';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.justifyContent = 'space-between';
    toast.style.gap = '12px';

    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">${isError ? '⚠️' : '📄'}</span>
        <span>${message}</span>
      </div>
      <button onclick="this.parentElement.remove()" style="background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 0 4px;">&times;</button>
    `;

    document.body.appendChild(toast);
    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.remove();
      }
    }, 5000);
  } catch (e) {
    console.error('[PDF Toast] Error showing toast:', e);
  }
}

export async function saveOrSharePDF(doc: jsPDF, filename: string) {
  const isNative = Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android';

  if (isNative) {
    try {
      console.log(`[PDF Native Engine] Processing native PDF generation for Android: ${filename}`);
      
      const arrayBuffer = doc.output('arraybuffer');
      const fileSizeInBytes = arrayBuffer.byteLength;
      const fileSizeInKB = (fileSizeInBytes / 1024).toFixed(2);
      
      const dataUri = doc.output('datauristring');
      const base64Data = dataUri.split(',')[1];

      let saveResult: { uri: string } | null = null;
      let usedDirectoryName = '';
      let targetDirectoryEnum = Directory.Cache;

      // Try writing to app-specific scoped directories sequentially without requiring legacy external permissions
      const targetDirectories = [
        { name: 'Cache', dir: Directory.Cache },
        { name: 'Data', dir: Directory.Data },
        { name: 'Documents', dir: Directory.Documents },
      ];

      for (const target of targetDirectories) {
        try {
          console.log(`[PDF Native Engine] Attempting save to Directory.${target.name}...`);
          saveResult = await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: target.dir,
            recursive: true
          });
          usedDirectoryName = target.name;
          targetDirectoryEnum = target.dir;
          console.log(`[PDF Native Engine] Successfully wrote file to Directory.${target.name}`);
          break;
        } catch (dirErr: any) {
          console.warn(`[PDF Native Engine] Directory.${target.name} write attempt failed:`, dirErr?.message || dirErr);
        }
      }

      if (!saveResult || !saveResult.uri) {
        throw new Error('Unable to write PDF file to any available storage directory.');
      }

      let canonicalUri = saveResult.uri;
      try {
        const uriResult = await Filesystem.getUri({
          path: filename,
          directory: targetDirectoryEnum
        });
        if (uriResult?.uri) {
          canonicalUri = uriResult.uri;
        }
      } catch (uErr) {
        console.warn('[PDF Native Engine] Filesystem.getUri call skipped:', uErr);
      }

      console.log(`[PDF Native Engine Metrics]`);
      console.log(` - Selected Directory: Directory.${usedDirectoryName}`);
      console.log(` - Saved File URI: ${canonicalUri}`);
      console.log(` - File Size: ${fileSizeInBytes} bytes (~${fileSizeInKB} KB)`);

      showPdfToast(`PDF saved (${fileSizeInKB} KB): ${filename}`);

      // Open Android native Share Sheet using the saved file URI
      let shareStatus = 'Pending';
      try {
        console.log(`[PDF Native Engine] Launching Android Share Sheet for URI: ${canonicalUri}`);
        await Share.share({
          title: filename,
          text: `Fundora PDF Receipt: ${filename}`,
          url: canonicalUri,
          dialogTitle: 'Save or Share PDF Receipt'
        });
        shareStatus = 'Opened / Shared successfully';
      } catch (shareErr: any) {
        if (shareErr?.name === 'AbortError' || shareErr?.message?.includes('canceled') || shareErr?.message?.includes('dismissed')) {
          shareStatus = 'User dismissed Share Sheet';
          console.log('[PDF Native Engine] User closed share dialog');
        } else {
          shareStatus = `Share Sheet Error: ${shareErr?.message || shareErr}`;
          console.warn('[PDF Native Engine] Android Share Sheet error:', shareErr);
          showPdfToast(`PDF saved at ${usedDirectoryName}. Share sheet issue: ${shareErr?.message || 'Unsupported'}`, true);
        }
      }

      console.log(` - Share Status: ${shareStatus}`);

    } catch (err: any) {
      console.error('[PDF Native Engine Error] Native Capacitor PDF generation/save failed:', err);
      showPdfToast(`Failed to save PDF: ${err?.message || err}`, true);
    }
    return;
  }

  // Web Browser Standard Download
  try {
    doc.save(filename);
    showPdfToast(`PDF downloaded: ${filename}`);
  } catch (webErr: any) {
    console.error('[PDF Web Engine Error] doc.save failed:', webErr);
    showPdfToast(`Failed to download PDF: ${webErr?.message || webErr}`, true);
  }
}

export function generateReceiptPDF(item: any, type: 'transaction' | 'claim') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Page width and height
  const pageWidth = doc.internal.pageSize.width; // 210mm
  const pageHeight = doc.internal.pageSize.height; // 297mm

  // Colors
  const primaryColor = [15, 23, 42]; // Slate 900
  const accentColor = [16, 185, 129]; // Emerald 500
  const textColor = [51, 65, 85]; // Slate 700

  // 1. Header Box (Dark Theme)
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 48, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FUNDORA REAL ESTATE', 15, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(150, 180, 200);
  doc.text('SECURE DECENTRALIZED LEDGER RECEIPT', 15, 29);

  // Decorative Accent bar
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 45, pageWidth, 3, 'F');

  // Receipt ID on right of header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const titleId = type === 'transaction' ? 'TX ID:' : 'CLAIM ID:';
  doc.text(`${titleId} ${item.id}`, pageWidth - 15, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(200, 200, 200);
  const statusStr = item.status || 'Verified';
  doc.text(`STATUS: ${statusStr.toUpperCase()}`, pageWidth - 15, 29, { align: 'right' });

  // 2. Main Title
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(type === 'claim' ? 'OFFICIAL YIELD CLAIM RECEIPT' : 'OFFICIAL TRANSACTION RECEIPT', 15, 58);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(type === 'claim' ? 'This document certifies the official yield payout settlement and clearance index recorded on the Fundora Real Estate ledger.' : 'This document verifies that the transaction described below is recorded and cleared in the Fundora Real Estate central ledger.', 15, 66, { maxWidth: 180 });

  // 3. Grid Details
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.3);
  doc.line(15, 76, pageWidth - 15, 76);

  let y = 84;
  const drawRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label, 15, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);

    const splitVal = doc.splitTextToSize(value || 'N/A', 115);
    doc.text(splitVal, 75, y);

    const lineCount = Array.isArray(splitVal) ? splitVal.length : 1;
    const contentHeight = Math.max(5, lineCount * 4.2);
    const lineY = y + contentHeight + 1;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(15, lineY, pageWidth - 15, lineY);

    y = lineY + 5.5;
  };

  // Populate data based on type
  if (type === 'transaction') {
    drawRow('Transaction ID', item.id);
    drawRow('User Account', item.userEmail || 'N/A');
    drawRow('Transaction Type', item.type);
    drawRow('Asset Amount', `$${Number(item.amount).toFixed(2)} USDT`);
    drawRow('Timestamp', item.date);
    drawRow('Network Protocol', item.network ? `USDT (${item.network} Network)` : 'Internal App Settlement');
    if (item.walletAddress) {
      drawRow('Destination Wallet', item.walletAddress);
    }
    if (item.txHash) {
      drawRow('Cryptographic Hash', item.txHash);
    }
    drawRow('Details', item.description || 'N/A');
  } else {
    const isClaimed = item.status === 'Claimed' || item.status === 'Completed';
    const slotText = item.slot === 16 ? '04:00 PM - 05:00 PM (Slot 1)' : item.slot === 21 ? '09:00 PM - 10:00 PM (Slot 2)' : (item.description && item.description.includes('04:00 PM') ? '04:00 PM - 05:00 PM (Slot 1)' : item.description && item.description.includes('09:00 PM') ? '09:00 PM - 10:00 PM (Slot 2)' : 'Daily Claim Window');
    
    let timeFormatted = item.claimedAt || '';
    if (!timeFormatted && item.date && item.date.includes(' ')) {
      timeFormatted = item.date.split(' ')[1];
    }
    if (!timeFormatted) {
      timeFormatted = isClaimed ? '16:00:00' : '17:00:00 (Window Closed)';
    }

    drawRow('Settlement ID', item.id);
    drawRow('User Account', item.userEmail || 'N/A');
    drawRow('Settlement Type', 'Daily Yield Claim (50% Slot Payout)');
    drawRow('Accrued Yield Amount', `$${Number(item.amount).toFixed(2)} USDT`);
    drawRow('Settlement Date', item.date ? item.date.split(' ')[0] : 'N/A');
    drawRow(isClaimed ? 'Exact Claim Time' : 'Expiration Time', timeFormatted);
    drawRow('Claim Window Slot', slotText);
    drawRow('Status', isClaimed ? 'CLAIMED & CREDITED' : (item.status ? item.status.toUpperCase() : 'MISSED / EXPIRED'));
    drawRow('Details', item.description || (isClaimed ? `50% fractional portfolio yield claimed at ${timeFormatted} and credited directly to available balance.` : `50% fractional portfolio yield unclaimed during the ${slotText} window; marked expired at ${timeFormatted}.`));
  }

  // 4. Security Seal & Signatures
  y += 4;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.roundedRect(15, y, pageWidth - 30, 30, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('PLATFORM COMPLIANCE INTEGRITY AUDIT', 20, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('This is a computer-generated, cryptographically signed ledger record. The integrity of this clearance index is verified under platform compliance locks. No physical signature is required.', 20, y + 13, { maxWidth: 115 });

  // Verified Badge
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.roundedRect(pageWidth - 65, y + 16, 40, 8, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('LEDGER VERIFIED', pageWidth - 45, y + 21, { align: 'center' });

  // 5. Tech Barcode-like element and Footer
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.8);
  // draw a stylized digital signature barcode bar
  for (let i = 0; i < 40; i++) {
    const width = Math.random() > 0.4 ? 1 : 0.3;
    doc.setLineWidth(width);
    doc.line(15 + i * 2, pageHeight - 28, 15 + i * 2, pageHeight - 18);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('FUNDORA REAL ESTATE TRADING PLATFORM', pageWidth - 15, pageHeight - 25, { align: 'right' });
  doc.text('Verify ledger integrity via public index on the platform homepage.', pageWidth - 15, pageHeight - 20, { align: 'right' });

  // Save or share the PDF
  const filename = `Receipt-${item.id}.pdf`;
  saveOrSharePDF(doc, filename);
}

export function generateDocumentPDF(docName: string, project: any) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width; // 210mm
  const pageHeight = doc.internal.pageSize.height; // 297mm

  const primaryColor = [15, 23, 42]; // Slate 900
  const accentColor = [16, 185, 129]; // Emerald 500
  const secondaryColor = [245, 158, 11]; // Amber 500

  // 1. Header Band
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 48, 'F');

  // Decorative Accent bar
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 45, pageWidth, 3, 'F');

  // Brand Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FUNDORA FRACTIONAL REAL ESTATE', 15, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text('SECURE CO-OWNERSHIP DEED & LEGAL REGULATION DEPOSIT', 15, 29);

  // Document Badge on Header
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.roundedRect(pageWidth - 75, 12, 60, 7.5, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('OFFICIAL CERTIFIED DEED', pageWidth - 45, 17, { align: 'center' });

  // 2. Document Details Section
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('LEGAL COMPLIANCE PROSPECTUS', 15, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`This document serves as an official certified digital prospectus copy of "${docName}" attached to the fractionalized real estate offering described below.`, 15, 58, { maxWidth: 180 });

  // 3. Grid for Property Info
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.3);
  doc.line(15, 68, pageWidth - 15, 68);

  let y = 76;
  const drawRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label, 15, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);

    const splitVal = doc.splitTextToSize(value || 'N/A', 115);
    doc.text(splitVal, 75, y);

    const lineCount = Array.isArray(splitVal) ? splitVal.length : 1;
    const contentHeight = Math.max(5, lineCount * 4.2);
    const lineY = y + contentHeight + 1;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(15, lineY, pageWidth - 15, lineY);

    y = lineY + 5.5;
  };

  drawRow('Property Asset Name', project.name);
  drawRow('Asset ID', `PROJ-00${project.id}`);
  drawRow('Asset Location', project.location);
  drawRow('Asset Category', project.category || 'N/A');
  drawRow('Total Target Valuation', `$${(project.totalShares * project.pricePerShare).toLocaleString()} USDT`);
  drawRow('Share Price Unit', `$${project.pricePerShare} USDT / Share`);
  drawRow('Regulatory Issuer', 'Fundora Global Asset Custody Trust LLC');
  drawRow('Compliance Standard', 'ERC-3643 Securities Protocol');

  // Customize content based on doc type
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);

  let legalText = '';
  let subTitle = 'REGULATORY & TRUSTEE STATEMENTS';
  if (docName.toLowerCase().includes('specs')) {
    subTitle = 'DETAILED PHYSICAL & TECHNICAL SPECIFICATIONS';
    legalText = `This document certifies the technical specifications and structural blueprints for the property project "${project.name}" located at ${project.location}.

Property Specifications & Parameters:
- Asset Classification: ${project.category || 'Luxury Real Estate Asset'}
- Total Unit Shares: ${project.totalShares} Shares
- Individual Share Valuation: $${project.pricePerShare} USDT / Share
- Target Projected Annual ROI: ${project.expectedRoi}% APR

Structural & Layout Details:
${project.description}

All structural materials, load bearings, electrical fittings, and architectural systems comply fully with regional luxury zoning and premium building safety standards. Certified and validated for digital custody under Fundora Trust.`;
  } else if (docName.toLowerCase().includes('approval') || docName.toLowerCase().includes('permit')) {
    subTitle = 'OFFICIAL REGULATORY & DEVELOPMENT APPROVAL';
    legalText = `This certificate grants formal development and regulatory compliance approval for "${project.name}" located at ${project.location}.

Regulatory Approval Metrics:
- Review Authority: Municipal Development Authority & Real Estate Regulatory Agency (RERA)
- Compliance Standard: ERC-3643 Securities Protocol Verified
- Zoning Allocation: Multi-Tenant Residential / Luxury Commercial Space
- Escrow Security Level: Tier-1 Bank-Backed Digital Escrow Guard

Approval Statement:
RERA and the planning councils hereby confirm that all safety audits, zoning approvals, structural blueprints, and environmental impact assessments for "${project.name}" have been completed, authorized, and signed off. Digital fractional shares issued under Registry ID PROJ-00${project.id} are cleared for secure public co-ownership.`;
  } else {
    subTitle = 'OFFICIAL NO OBJECTION CERTIFICATE (NOC)';
    legalText = `This document serves as an absolute, unconditional No Objection Certificate (NOC) for "${project.name}" located at ${project.location}.

NOC Grantee Details:
- Asset Name: ${project.name}
- Securitization ID: SEC-RWA-00${project.id}
- Escrow Controller: Fundora Global Asset Custody Trust LLC
- Scope: Digital Tokenization & Fractional Co-Ownership Distribution

NOC Declaration:
The sovereign land registry and local municipal boards have reviewed the digital prospectus and escrow structures of "${project.name}". We certify that we have NO OBJECTION to the fractionalized co-ownership, distribution, or tokenized secondary trading of this asset. This property holds a clean title, is free of any lien, hypothecation, or encumbrance, and is officially approved for fractional yield settlements.`;
  }

  doc.text(subTitle, 15, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);

  const splitText = doc.splitTextToSize(legalText, 180);
  doc.text(splitText, 15, y);

  // Calculate dynamic text height. 8.5 pt font is roughly 3.5mm per line (including default line spacing)
  const textHeight = splitText.length * 3.5;
  y += textHeight + 8;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.roundedRect(15, y, pageWidth - 30, 32, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('CRYPTOGRAPHIC TRUST INTEGRITY VERIFIED', 20, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`This is a regulatory grade electronic prospectus deposit copy. Original filing records, metadata, and notary hashes are registered on-chain with SHA-256 block indexes: 8e5f2a1b94d2c7380cf87${project.id}a4e5d6c7b8a90123.`, 20, y + 14, { maxWidth: 115 });

  // Stamp Badge
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.roundedRect(pageWidth - 65, y + 18, 40, 8, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('STATUS: SECURED', pageWidth - 45, y + 23, { align: 'center' });

  // Barcode / Tech footer
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  for (let i = 0; i < 48; i++) {
    const width = Math.random() > 0.4 ? 1.1 : 0.3;
    doc.setLineWidth(width);
    doc.line(15 + i * 1.8, pageHeight - 28, 15 + i * 1.8, pageHeight - 18);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('FUNDORA GLOBAL ASSETS SECURITIZATION REGISTER', pageWidth - 15, pageHeight - 25, { align: 'right' });
  doc.text('Verify registry signatures online using the secured portal.', pageWidth - 15, pageHeight - 20, { align: 'right' });

  const finalFilename = docName.toLowerCase().endsWith('.pdf') ? docName : `${docName}.pdf`;
  saveOrSharePDF(doc, finalFilename);
}
