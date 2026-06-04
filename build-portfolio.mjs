#!/usr/bin/env node
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { execSync } from "child_process";
import { setTimeout as sleep } from "timers/promises";

// Kill any existing MCP server
try { execSync("lsof -ti :8120 | xargs kill -9 2>/dev/null", { stdio: "ignore" }); } catch {}
await sleep(3000);

// Spawn MCP server and connect
const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js", "opencode-indesign.json"],
});
const client = new Client({ name: "builder", version: "1.0.0" });
await client.connect(transport);
console.log("✅ Connected to MCP server");

// Wait for InDesign bridge connection
await sleep(3000);

async function tool(name, args = {}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const result = await client.callTool({ name, arguments: args });
      const text = result.content?.[0]?.text || JSON.stringify(result);
      if (result.isError) {
        if (text.includes("timed out") && attempt < 4) { await sleep(4000); continue; }
        throw new Error(text);
      }
      return JSON.parse(text);
    } catch (e) {
      if (e.message?.includes("timed out") && attempt < 4) { await sleep(4000); continue; }
      throw e;
    }
  }
}

// ---------- DOCUMENT ----------
console.log("\n📄 Creating document...");
const doc = await tool("document_create", { width: 210, height: 297, pages: 3, margins: { top: 15, bottom: 15, left: 20, right: 20 } });
console.log(`   ${doc.name}`);

// ---------- SWATCHES ----------
console.log("🎨 Creating swatches...");
await tool("executeScript", {
  code: `var d=app.activeDocument;
var c=[{n:"Bauhaus Red",r:217,g:28,b:28},{n:"Bauhaus Yellow",r:255,g:205,b:0},{n:"Bauhaus Blue",r:0,g:82,b:155},{n:"Bauhaus Black",r:0,g:0,b:0},{n:"Bauhaus Gray",r:200,g:200,b:200}];
for(var i=0;i<c.length;i++){try{var s=d.colors.add();s.name=c[i].n;s.model=ColorModel.process;s.space=ColorSpace.RGB;s.colorValue=[c[i].r,c[i].g,c[i].b];}catch(e){}}`
});
console.log("   ✅ Swatches ready");

function S(n) { return 'd.colors.item("' + n + '")'; }

// ---------- PAGE 4: BAUHAUS ----------
console.log("\n📐 Bauhaus page...");
await tool("page_add", { position: "atEnd" });
await tool("executeScript", {
  code: `var d=app.activeDocument;var p=d.pages[3];
var r;function sw(n){return d.colors.item(n);}
r=p.rectangles.add();r.geometricBounds=[15,115,145,205];r.fillColor=sw("Bauhaus Yellow");r.strokeWeight=0;
r=p.ovals.add();r.geometricBounds=[130,115,245,210];r.fillColor=sw("Bauhaus Red");r.strokeWeight=0;
r=p.rectangles.add();r.geometricBounds=[200,15,285,80];r.fillColor=sw("Bauhaus Blue");r.strokeWeight=0;
r=p.ovals.add();r.geometricBounds=[210,165,245,200];r.fillColor=sw("Bauhaus Yellow");r.strokeWeight=0;
r=p.rectangles.add();r.geometricBounds=[15,15,50,50];r.fillColor=sw("Bauhaus Black");r.strokeWeight=0;
r=p.rectangles.add();r.geometricBounds=[28,28,42,42];r.fillColor=d.colors.item("Paper");r.strokeWeight=0;
var tf=p.textFrames.add();tf.geometricBounds=[60,20,105,110];tf.contents="PORTFOLIO";
var ts=tf.parentStory;ts.appliedFont="Arial\\tBold";ts.pointSize=44;ts.leading=46;ts.fillColor=sw("Bauhaus Black");ts.justification=Justification.LEFT_ALIGN;
tf=p.textFrames.add();tf.geometricBounds=[105,20,130,110];tf.contents="ANDREA CACIOPPO";
ts=tf.parentStory;ts.appliedFont="Arial\\tBold";ts.pointSize=17;ts.leading=21;ts.fillColor=sw("Bauhaus Black");ts.justification=Justification.LEFT_ALIGN;
var gl=p.graphicLines.add();gl.geometricBounds=[133,20,133,90];gl.strokeWeight=2.5;gl.strokeColor=sw("Bauhaus Red");
gl=p.graphicLines.add();gl.geometricBounds=[195,15,195,205];gl.strokeWeight=5;gl.strokeColor=sw("Bauhaus Black");
gl=p.graphicLines.add();gl.geometricBounds=[15,115,60,115];gl.strokeWeight=4;gl.strokeColor=sw("Bauhaus Black");
r=p.ovals.add();r.geometricBounds=[10,190,28,208];r.fillColor=sw("Bauhaus Blue");r.strokeWeight=0;`
});
console.log("   ✅ Bauhaus (pg 4)");

// ---------- PAGE 5: FUTURIST ----------
console.log("\n🚀 Futurist page...");
await tool("page_add", { position: "atEnd" });
await tool("executeScript", {
  code: `var d=app.activeDocument;var p=d.pages[4];
var bk=d.colors.item("Bauhaus Black"),rd=d.colors.item("Bauhaus Red");
var yw=d.colors.item("Bauhaus Yellow"),bl=d.colors.item("Bauhaus Blue");
var gy=d.colors.item("Bauhaus Gray"),pp=d.colors.item("Paper");

// Speed lines (12 diagonali)
for(var i=0;i<12;i++){var off=i*14-40;
  var gl=p.graphicLines.add();
  gl.geometricBounds=[20+off,10+off*0.4,260+off*0.6,200+off*0.3];
  gl.strokeWeight=i%3==0?4:1.5;gl.strokeColor=i%3==0?bk:rd;
}

// Black rotated shape
var sh=p.rectangles.add();sh.geometricBounds=[25,95,175,210];
sh.fillColor=bk;sh.strokeWeight=0;sh.rotationAngle=-12;

// Red rotated shape
sh=p.rectangles.add();sh.geometricBounds=[125,10,260,140];
sh.fillColor=rd;sh.strokeWeight=0;sh.rotationAngle=8;

// White overlay
sh=p.rectangles.add();sh.geometricBounds=[45,18,175,120];
sh.fillColor=pp;sh.strokeWeight=0;sh.rotationAngle=-5;

// Speed ring
var ov=p.ovals.add();ov.geometricBounds=[55,130,175,250];
ov.fillColor=pp;ov.strokeWeight=5;ov.strokeColor=bk;

// Inner red circle
ov=p.ovals.add();ov.geometricBounds=[75,150,155,230];
ov.fillColor=rd;ov.strokeWeight=0;

// 5 dots around ring
for(var i=0;i<5;i++){var a=i*72,cx=190,cy=115,rad=40;
  var dx=cx+Math.sin(a*Math.PI/180)*rad;
  var dy=cy-Math.cos(a*Math.PI/180)*rad;
  ov=p.ovals.add();ov.geometricBounds=[dy-5,dx-5,dy+5,dx+5];ov.fillColor=bk;ov.strokeWeight=0;
}

// PORTFOLIO text (rotated -5deg)
var tf=p.textFrames.add();tf.geometricBounds=[55,28,105,115];tf.contents="PORTFOLIO";
var ts=tf.parentStory;ts.appliedFont="Arial\\tBlack";ts.pointSize=38;ts.leading=40;
ts.fillColor=bk;ts.justification=Justification.LEFT_ALIGN;tf.rotationAngle=-5;

// ANDREA (rotated +3deg)
tf=p.textFrames.add();tf.geometricBounds=[105,30,140,110];tf.contents="ANDREA";
ts=tf.parentStory;ts.appliedFont="Arial\\tBlack";ts.pointSize=22;ts.leading=26;
ts.fillColor=rd;ts.justification=Justification.LEFT_ALIGN;tf.rotationAngle=3;

// CACIOPPO (rotated +3deg)
tf=p.textFrames.add();tf.geometricBounds=[135,30,165,115];tf.contents="CACIOPPO";
ts=tf.parentStory;ts.appliedFont="Arial\\tBold";ts.pointSize=18;ts.leading=22;
ts.fillColor=bk;ts.justification=Justification.LEFT_ALIGN;tf.rotationAngle=3;

// Manifesto text
tf=p.textFrames.add();tf.geometricBounds=[170,30,190,100];tf.contents="DINAMISMO • VELOCITÀ • FUTURO";
ts=tf.parentStory;ts.appliedFont="Arial\\tBold";ts.pointSize=9;ts.leading=11;
ts.fillColor=rd;ts.justification=Justification.LEFT_ALIGN;tf.rotationAngle=-3;

// Accents
sh=p.rectangles.add();sh.geometricBounds=[15,15,30,30];sh.fillColor=bk;sh.strokeWeight=0;
sh=p.rectangles.add();sh.geometricBounds=[170,170,185,185];sh.fillColor=rd;sh.strokeWeight=0;sh.rotationAngle=15;
var gl=p.graphicLines.add();gl.geometricBounds=[167,30,167,100];gl.strokeWeight=2.5;gl.strokeColor=rd;`
});
console.log("   ✅ Futurist (pg 5)");

// ---------- EXPORT ----------
console.log("\n📸 Exporting...");
await tool("executeScript", {
  code: `app.activeDocument.exportFile(ExportFormat.JPG, File("/Users/andreacacioppo/Indesign-MCP/futurist-page5.jpg"), false);`
});
console.log("   ✅ JPG exported");

await tool("executeScript", {
  code: `app.activeDocument.exportFile(ExportFormat.PDF_TYPE, File("/Users/andreacacioppo/Desktop/portfolio-futurista.pdf"), false);`
});
console.log("   ✅ PDF exported to Desktop");

console.log("\n🎉 DONE! Bauhaus (pg 4) + Futurist (pg 5)");
transport.close();
process.exit(0);
