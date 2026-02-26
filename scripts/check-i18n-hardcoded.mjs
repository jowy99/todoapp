#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, "src");

const attributeNames = new Set(["aria-label", "aria-description", "title", "placeholder", "alt"]);
const findings = [];

function hasReadableLetters(value) {
  return /\p{L}/u.test(value);
}

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function positionFor(sourceFile, position) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(position);
  return `${line + 1}:${character + 1}`;
}

function scanNode(sourceFile, node) {
  if (ts.isJsxText(node)) {
    const text = normalizeText(node.getText(sourceFile));
    if (text.length > 0 && hasReadableLetters(text)) {
      findings.push({
        file: sourceFile.fileName,
        where: positionFor(sourceFile, node.getStart(sourceFile)),
        type: "JSX text",
        value: text,
      });
    }
  }

  if (ts.isJsxAttribute(node)) {
    const name = node.name.getText(sourceFile);
    if (attributeNames.has(name) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const value = normalizeText(node.initializer.text);
      if (value.length > 0 && hasReadableLetters(value)) {
        findings.push({
          file: sourceFile.fileName,
          where: positionFor(sourceFile, node.initializer.getStart(sourceFile)),
          type: `Attribute ${name}`,
          value,
        });
      }
    }
  }

  ts.forEachChild(node, (child) => scanNode(sourceFile, child));
}

function scanFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  scanNode(sourceFile, sourceFile);
}

function walk(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist") {
      continue;
    }

    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (absolutePath.endsWith(".tsx")) {
      scanFile(absolutePath);
    }
  }
}

walk(srcRoot);

if (findings.length === 0) {
  console.log("No obvious hardcoded UI strings were found in JSX text/attributes.");
  process.exit(0);
}

console.error("Potential hardcoded UI strings detected:");
for (const finding of findings) {
  const relativeFile = path.relative(projectRoot, finding.file);
  console.error(`- ${relativeFile}:${finding.where} [${finding.type}] ${finding.value}`);
}
process.exit(1);
