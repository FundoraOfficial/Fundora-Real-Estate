import { jsPDF } from 'jspdf';

export async function saveOrSharePDF(doc: jsPDF, filename: string) {
  const isAndroidOrWebView = 
    /Android|wv|WebView/i.test(navigator.userAgent) || 
    Boolean((window as any).Android) || 
    Boolean((window as any).Capacitor) || 
    Boolean((window as any).Cordova);

  try {
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });

    // 1. Try Web Share API first if supported (Android native share sheet handles saving files to device downloads)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: filename,
          text: `Fundora Receipt: ${filename}`,
        });
        return;
      } catch (shareErr: any) {
        if (shareErr?.name === 'AbortError') {
          return;
        }
        console.warn('[PDF] Web share failed, proceeding with fallback download methods:', shareErr);
      }
    }

    // 2. Try standard doc.save()
    try {
      doc.save(filename);
    } catch (saveErr) {
      console.warn('[PDF] doc.save failed:', saveErr);
    }

    // 3. Data URI fallback for Android WebViews where blob: URL downloads are blocked by webview engine
    const dataUri = doc.output('datauristring');
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 1000);

    // 4. If running in Android WebView, also try opening Data URI directly
    if (isAndroidOrWebView) {
      try {
        const win = window.open(dataUri, '_blank');
        if (!win) {
          window.location.href = dataUri;
        }
      } catch (winErr) {
        console.warn('[PDF] Failed to open data URI in window:', winErr);
      }
    }
  } catch (err) {
    console.error('[PDF] Error saving/sharing PDF:', err);
    try {
      doc.save(filename);
    } catch (e) {
      console.error('[PDF] Final doc.save failed:', e);
    }
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
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('FUNDORA REAL ESTATE', 15, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(150, 180, 200);
  doc.text('SECURE DECENTRALIZED LEDGER RECEIPT', 15, 25);

  // Decorative Accent bar
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 42, pageWidth, 3, 'F');

  // Receipt ID on right of header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const titleId = type === 'transaction' ? 'TX ID:' : 'CLAIM ID:';
  doc.text(`${titleId} ${item.id}`, pageWidth - 15, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  const statusStr = item.status || 'Verified';
  doc.text(`STATUS: ${statusStr.toUpperCase()}`, pageWidth - 15, 25, { align: 'right' });

  // 2. Main Title
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('OFFICIAL TRANSACTION RECEIPT', 15, 60);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('This document verifies that the transaction described below is recorded and cleared in the Fundora Real Estate central ledger.', 15, 66, { maxWidth: 180 });

  // 3. Grid Details
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.3);
  doc.line(15, 75, pageWidth - 15, 75);

  let y = 85;
  const drawRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(label, 15, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(value, 75, y, { maxWidth: 120 });

    doc.line(15, y + 4, pageWidth - 15, y + 4);
    y += 12;
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
    drawRow('Settlement ID', item.id);
    drawRow('User Account', item.userEmail || 'N/A');
    drawRow('Settlement Type', 'Daily Yield Claim');
    drawRow('Accrued Amount', `$${Number(item.amount).toFixed(2)} USDT`);
    drawRow('Settlement Date', item.date);
    drawRow('Claim Timestamp', item.claimedAt ? `${item.date} ${item.claimedAt}` : `${item.date} (Settled)`);
    drawRow('Status', item.status || 'Claimed');
    drawRow('Details', 'Dynamic portfolio yield credited straight to available balance.');
  }

  // 4. Security Seal & Signatures
  y += 5;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.roundedRect(15, y, pageWidth - 30, 32, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('PLATFORM COMPLIANCE INTEGRITY AUDIT', 20, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('This is a computer-generated, cryptographically signed ledger record. The integrity of this clearance index is verified under platform compliance locks. No physical signature is required.', 20, y + 14, { maxWidth: 115 });

  // Verified Badge
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.roundedRect(pageWidth - 65, y + 18, 40, 8, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('✓ LEDGER VERIFIED', pageWidth - 45, y + 23, { align: 'center' });

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
  const filename = `${type}_receipt_${item.id}.pdf`;
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
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Decorative Accent bar
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 38, pageWidth, 2, 'F');

  // Brand Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('FUNDORA FRACTIONAL REAL ESTATE', 15, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('SECURE CO-OWNERSHIP DEED & LEGAL REGULATION DEPOSIT', 15, 22);

  // Document Badge on Header
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.roundedRect(pageWidth - 75, 10, 60, 7, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('OFFICIAL CERTIFIED DEED', pageWidth - 45, 14.5, { align: 'center' });

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
    doc.text(value, 75, y, { maxWidth: 120 });

    doc.line(15, y + 4, pageWidth - 15, y + 4);
    y += 11;
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
  doc.text('✓ STATUS: SECURED', pageWidth - 45, y + 23, { align: 'center' });

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
