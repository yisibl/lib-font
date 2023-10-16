var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/parser.js
function asText(data) {
  return Array.from(data).map((v) => String.fromCharCode(v)).join(``);
}
var startDate, Parser, ParsedData;
var init_parser = __esm({
  "src/parser.js"() {
    startDate = (/* @__PURE__ */ new Date(`1904-01-01T00:00:00+0000`)).getTime();
    Parser = class {
      constructor(dict, dataview, name2) {
        this.name = (name2 || dict.tag || ``).trim();
        this.length = dict.length;
        this.start = dict.offset;
        this.offset = 0;
        this.data = dataview;
        [
          `getInt8`,
          `getUint8`,
          `getInt16`,
          `getUint16`,
          `getInt32`,
          `getUint32`,
          `getBigInt64`,
          `getBigUint64`
        ].forEach((name3) => {
          let fn = name3.replace(/get(Big)?/, "").toLowerCase();
          let increment = parseInt(name3.replace(/[^\d]/g, "")) / 8;
          Object.defineProperty(this, fn, {
            get: () => this.getValue(name3, increment)
          });
        });
      }
      get currentPosition() {
        return this.start + this.offset;
      }
      set currentPosition(position) {
        this.start = position;
        this.offset = 0;
      }
      skip(n = 0, bits = 8) {
        this.offset += n * bits / 8;
      }
      getValue(type, increment) {
        let pos = this.start + this.offset;
        this.offset += increment;
        try {
          return this.data[type](pos);
        } catch (e) {
          console.error(`parser`, type, increment, this);
          console.error(`parser`, this.start, this.offset);
          throw e;
        }
      }
      flags(n) {
        if (n === 8 || n === 16 || n === 32 || n === 64) {
          return this[`uint${n}`].toString(2).padStart(n, 0).split(``).map((v) => v === "1");
        }
        console.error(
          `Error parsing flags: flag types can only be 1, 2, 4, or 8 bytes long`
        );
        console.trace();
      }
      get tag() {
        const t = this.uint32;
        return asText([t >> 24 & 255, t >> 16 & 255, t >> 8 & 255, t & 255]);
      }
      get fixed() {
        let major = this.int16;
        let minor = Math.round(1e3 * this.uint16 / 65356);
        return major + minor / 1e3;
      }
      get legacyFixed() {
        let major = this.uint16;
        let minor = this.uint16.toString(16).padStart(4, 0);
        return parseFloat(`${major}.${minor}`);
      }
      get uint24() {
        return (this.uint8 << 16) + (this.uint8 << 8) + this.uint8;
      }
      get uint128() {
        let value = 0;
        for (let i = 0; i < 5; i++) {
          let byte = this.uint8;
          value = value * 128 + (byte & 127);
          if (byte < 128)
            break;
        }
        return value;
      }
      get longdatetime() {
        return new Date(startDate + 1e3 * parseInt(this.int64.toString()));
      }
      // alias datatypes
      get fword() {
        return this.int16;
      }
      get ufword() {
        return this.uint16;
      }
      get Offset16() {
        return this.uint16;
      }
      get Offset32() {
        return this.uint32;
      }
      // "that weird datatype"
      get F2DOT14() {
        const bits = p.uint16;
        const integer = [0, 1, -2, -1][bits >> 14];
        const fraction = bits & 16383;
        return integer + fraction / 16384;
      }
      verifyLength() {
        if (this.offset != this.length) {
          console.error(
            `unexpected parsed table size (${this.offset}) for "${this.name}" (expected ${this.length})`
          );
        }
      }
      /**
       * Read an entire data block.
       */
      readBytes(n = 0, position = 0, bits = 8, signed = false) {
        n = n || this.length;
        if (n === 0)
          return [];
        if (position)
          this.currentPosition = position;
        const fn = `${signed ? `` : `u`}int${bits}`, slice = [];
        while (n--)
          slice.push(this[fn]);
        return slice;
      }
    };
    ParsedData = class {
      constructor(parser) {
        const pGetter = { enumerable: false, get: () => parser };
        Object.defineProperty(this, `parser`, pGetter);
        const start = parser.currentPosition;
        const startGetter = { enumerable: false, get: () => start };
        Object.defineProperty(this, `start`, startGetter);
      }
      load(struct) {
        Object.keys(struct).forEach((p2) => {
          let props = Object.getOwnPropertyDescriptor(struct, p2);
          if (props.get) {
            this[p2] = props.get.bind(this);
          } else if (props.value !== void 0) {
            this[p2] = props.value;
          }
        });
        if (this.parser.length) {
          this.parser.verifyLength();
        }
      }
    };
  }
});

// src/opentype/tables/simple-table.js
var SimpleTable;
var init_simple_table = __esm({
  "src/opentype/tables/simple-table.js"() {
    init_parser();
    SimpleTable = class extends ParsedData {
      constructor(dict, dataview, name2) {
        const { parser, start } = super(new Parser(dict, dataview, name2));
        const pGetter = { enumerable: false, get: () => parser };
        Object.defineProperty(this, `p`, pGetter);
        const startGetter = { enumerable: false, get: () => start };
        Object.defineProperty(this, `tableStart`, startGetter);
      }
    };
  }
});

// src/lazy.js
function lazy(object, property, getter) {
  let val;
  Object.defineProperty(object, property, {
    get: () => {
      if (val)
        return val;
      val = getter();
      return val;
    },
    enumerable: true
  });
}
var init_lazy = __esm({
  "src/lazy.js"() {
  }
});

// src/opentype/tables/simple/cmap/subtable.js
var Subtable;
var init_subtable = __esm({
  "src/opentype/tables/simple/cmap/subtable.js"() {
    init_parser();
    Subtable = class extends ParsedData {
      constructor(p2, plaformID, encodingID) {
        super(p2);
        this.plaformID = plaformID;
        this.encodingID = encodingID;
      }
    };
  }
});

// src/opentype/tables/simple/cmap/format0.js
var Format0;
var init_format0 = __esm({
  "src/opentype/tables/simple/cmap/format0.js"() {
    init_subtable();
    Format0 = class extends Subtable {
      constructor(p2, platformID, encodingID) {
        super(p2, platformID, encodingID);
        this.format = 0;
        this.length = p2.uint16;
        this.language = p2.uint16;
        this.glyphIdArray = [...new Array(256)].map((_) => p2.uint8);
      }
      supports(charCode) {
        if (charCode.charCodeAt) {
          charCode = -1;
          console.warn(
            `supports(character) not implemented for cmap subtable format 0. only supports(id) is implemented.`
          );
        }
        return 0 <= charCode && charCode <= 255;
      }
      reverse(glyphID) {
        console.warn(`reverse not implemented for cmap subtable format 0`);
        return {};
      }
      getSupportedCharCodes() {
        return [{ start: 1, end: 256 }];
      }
    };
  }
});

// src/opentype/tables/simple/cmap/format2.js
var Format2, SubHeader;
var init_format2 = __esm({
  "src/opentype/tables/simple/cmap/format2.js"() {
    init_lazy();
    init_subtable();
    Format2 = class extends Subtable {
      constructor(p2, platformID, encodingID) {
        super(p2, platformID, encodingID);
        this.format = 2;
        this.length = p2.uint16;
        this.language = p2.uint16;
        this.subHeaderKeys = [...new Array(256)].map((_) => p2.uint16);
        const subHeaderCount = Math.max(...this.subHeaderKeys);
        const subHeaderOffset = p2.currentPosition;
        lazy(this, `subHeaders`, () => {
          p2.currentPosition = subHeaderOffset;
          return [...new Array(subHeaderCount)].map((_) => new SubHeader(p2));
        });
        const glyphIndexOffset = subHeaderOffset + subHeaderCount * 8;
        lazy(this, `glyphIndexArray`, () => {
          p2.currentPosition = glyphIndexOffset;
          return [...new Array(subHeaderCount)].map((_) => p2.uint16);
        });
      }
      supports(charCode) {
        if (charCode.charCodeAt) {
          charCode = -1;
          console.warn(
            `supports(character) not implemented for cmap subtable format 2. only supports(id) is implemented.`
          );
        }
        const low = charCode && 255;
        const high = charCode && 65280;
        const subHeaderKey = this.subHeaders[high];
        const subheader = this.subHeaders[subHeaderKey];
        const first = subheader.firstCode;
        const last = first + subheader.entryCount;
        return first <= low && low <= last;
      }
      reverse(glyphID) {
        console.warn(`reverse not implemented for cmap subtable format 2`);
        return {};
      }
      getSupportedCharCodes(preservePropNames = false) {
        if (preservePropNames) {
          return this.subHeaders.map((h) => ({
            firstCode: h.firstCode,
            lastCode: h.lastCode
          }));
        }
        return this.subHeaders.map((h) => ({
          start: h.firstCode,
          end: h.lastCode
        }));
      }
    };
    SubHeader = class {
      constructor(p2) {
        this.firstCode = p2.uint16;
        this.entryCount = p2.uint16;
        this.lastCode = this.first + this.entryCount;
        this.idDelta = p2.int16;
        this.idRangeOffset = p2.uint16;
      }
    };
  }
});

// src/opentype/tables/simple/cmap/format4.js
var Format4;
var init_format4 = __esm({
  "src/opentype/tables/simple/cmap/format4.js"() {
    init_lazy();
    init_subtable();
    Format4 = class extends Subtable {
      constructor(p2, platformID, encodingID) {
        super(p2, platformID, encodingID);
        this.format = 4;
        this.length = p2.uint16;
        this.language = p2.uint16;
        this.segCountX2 = p2.uint16;
        this.segCount = this.segCountX2 / 2;
        this.searchRange = p2.uint16;
        this.entrySelector = p2.uint16;
        this.rangeShift = p2.uint16;
        const endCodePosition = p2.currentPosition;
        lazy(
          this,
          `endCode`,
          () => p2.readBytes(this.segCount, endCodePosition, 16)
        );
        const startCodePosition = endCodePosition + 2 + this.segCountX2;
        lazy(
          this,
          `startCode`,
          () => p2.readBytes(this.segCount, startCodePosition, 16)
        );
        const idDeltaPosition = startCodePosition + this.segCountX2;
        lazy(
          this,
          `idDelta`,
          () => p2.readBytes(this.segCount, idDeltaPosition, 16, true)
          // Note that idDelta values are signed
        );
        const idRangePosition = idDeltaPosition + this.segCountX2;
        lazy(
          this,
          `idRangeOffset`,
          () => p2.readBytes(this.segCount, idRangePosition, 16)
        );
        const glyphIdArrayPosition = idRangePosition + this.segCountX2;
        const glyphIdArrayLength = this.length - (glyphIdArrayPosition - this.tableStart);
        lazy(
          this,
          `glyphIdArray`,
          () => p2.readBytes(glyphIdArrayLength, glyphIdArrayPosition, 16)
        );
        lazy(
          this,
          `segments`,
          () => this.buildSegments(idRangePosition, glyphIdArrayPosition, p2)
        );
      }
      buildSegments(idRangePosition, glyphIdArrayPosition, p2) {
        const build = (_, i) => {
          let startCode = this.startCode[i], endCode = this.endCode[i], idDelta = this.idDelta[i], idRangeOffset = this.idRangeOffset[i], idRangeOffsetPointer = idRangePosition + 2 * i, glyphIDs = [];
          if (idRangeOffset === 0) {
            for (let i2 = startCode + idDelta, e = endCode + idDelta; i2 <= e; i2++) {
              glyphIDs.push(i2);
            }
          } else {
            for (let i2 = 0, e = endCode - startCode; i2 <= e; i2++) {
              p2.currentPosition = idRangeOffsetPointer + idRangeOffset + i2 * 2;
              glyphIDs.push(p2.uint16);
            }
          }
          return { startCode, endCode, idDelta, idRangeOffset, glyphIDs };
        };
        return [...new Array(this.segCount)].map(build);
      }
      reverse(glyphID) {
        let s = this.segments.find((v) => v.glyphIDs.includes(glyphID));
        if (!s)
          return {};
        const code = s.startCode + s.glyphIDs.indexOf(glyphID);
        return { code, unicode: String.fromCodePoint(code) };
      }
      getGlyphId(charCode) {
        if (charCode.charCodeAt)
          charCode = charCode.charCodeAt(0);
        if (55296 <= charCode && charCode <= 57343)
          return 0;
        if ((charCode & 65534) === 65534 || (charCode & 65535) === 65535)
          return 0;
        let segment = this.segments.find(
          (s) => s.startCode <= charCode && charCode <= s.endCode
        );
        if (!segment)
          return 0;
        return segment.glyphIDs[charCode - segment.startCode];
      }
      supports(charCode) {
        return this.getGlyphId(charCode) !== 0;
      }
      getSupportedCharCodes(preservePropNames = false) {
        if (preservePropNames)
          return this.segments;
        return this.segments.map((v) => ({ start: v.startCode, end: v.endCode }));
      }
    };
  }
});

// src/opentype/tables/simple/cmap/format6.js
var Format6;
var init_format6 = __esm({
  "src/opentype/tables/simple/cmap/format6.js"() {
    init_lazy();
    init_subtable();
    Format6 = class extends Subtable {
      constructor(p2, platformID, encodingID) {
        super(p2, platformID, encodingID);
        this.format = 6;
        this.length = p2.uint16;
        this.language = p2.uint16;
        this.firstCode = p2.uint16;
        this.entryCount = p2.uint16;
        this.lastCode = this.firstCode + this.entryCount - 1;
        const getter = () => [...new Array(this.entryCount)].map((_) => p2.uint16);
        lazy(this, `glyphIdArray`, getter);
      }
      supports(charCode) {
        if (charCode.charCodeAt) {
          charCode = -1;
          console.warn(
            `supports(character) not implemented for cmap subtable format 6. only supports(id) is implemented.`
          );
        }
        if (charCode < this.firstCode)
          return {};
        if (charCode > this.firstCode + this.entryCount)
          return {};
        const code = charCode - this.firstCode;
        return { code, unicode: String.fromCodePoint(code) };
      }
      reverse(glyphID) {
        let pos = this.glyphIdArray.indexOf(glyphID);
        if (pos > -1)
          return this.firstCode + pos;
      }
      getSupportedCharCodes(preservePropNames = false) {
        if (preservePropNames) {
          return [{ firstCode: this.firstCode, lastCode: this.lastCode }];
        }
        return [{ start: this.firstCode, end: this.lastCode }];
      }
    };
  }
});

// src/opentype/tables/simple/cmap/format8.js
var Format8, SequentialMapGroup;
var init_format8 = __esm({
  "src/opentype/tables/simple/cmap/format8.js"() {
    init_lazy();
    init_subtable();
    Format8 = class extends Subtable {
      constructor(p2, platformID, encodingID) {
        super(p2, platformID, encodingID);
        this.format = 8;
        p2.uint16;
        this.length = p2.uint32;
        this.language = p2.uint32;
        this.is32 = [...new Array(8192)].map((_) => p2.uint8);
        this.numGroups = p2.uint32;
        const getter = () => [...new Array(this.numGroups)].map((_) => new SequentialMapGroup(p2));
        lazy(this, `groups`, getter);
      }
      supports(charCode) {
        if (charCode.charCodeAt) {
          charCode = -1;
          console.warn(
            `supports(character) not implemented for cmap subtable format 8. only supports(id) is implemented.`
          );
        }
        return this.groups.findIndex(
          (s) => s.startcharCode <= charCode && charCode <= s.endcharCode
        ) !== -1;
      }
      reverse(glyphID) {
        console.warn(`reverse not implemented for cmap subtable format 8`);
        return {};
      }
      getSupportedCharCodes(preservePropNames = false) {
        if (preservePropNames)
          return this.groups;
        return this.groups.map((v) => ({
          start: v.startcharCode,
          end: v.endcharCode
        }));
      }
    };
    SequentialMapGroup = class {
      constructor(p2) {
        this.startcharCode = p2.uint32;
        this.endcharCode = p2.uint32;
        this.startGlyphID = p2.uint32;
      }
    };
  }
});

// src/opentype/tables/simple/cmap/format10.js
var Format10;
var init_format10 = __esm({
  "src/opentype/tables/simple/cmap/format10.js"() {
    init_lazy();
    init_subtable();
    Format10 = class extends Subtable {
      constructor(p2, platformID, encodingID) {
        super(p2, platformID, encodingID);
        this.format = 10;
        p2.uint16;
        this.length = p2.uint32;
        this.language = p2.uint32;
        this.startCharCode = p2.uint32;
        this.numChars = p2.uint32;
        this.endCharCode = this.startCharCode + this.numChars;
        const getter = () => [...new Array(this.numChars)].map((_) => p2.uint16);
        lazy(this, `glyphs`, getter);
      }
      supports(charCode) {
        if (charCode.charCodeAt) {
          charCode = -1;
          console.warn(
            `supports(character) not implemented for cmap subtable format 10. only supports(id) is implemented.`
          );
        }
        if (charCode < this.startCharCode)
          return false;
        if (charCode > this.startCharCode + this.numChars)
          return false;
        return charCode - this.startCharCode;
      }
      reverse(glyphID) {
        console.warn(`reverse not implemented for cmap subtable format 10`);
        return {};
      }
      getSupportedCharCodes(preservePropNames = false) {
        if (preservePropNames) {
          return [
            { startCharCode: this.startCharCode, endCharCode: this.endCharCode }
          ];
        }
        return [{ start: this.startCharCode, end: this.endCharCode }];
      }
    };
  }
});

// src/opentype/tables/simple/cmap/format12.js
var Format12, SequentialMapGroup2;
var init_format12 = __esm({
  "src/opentype/tables/simple/cmap/format12.js"() {
    init_lazy();
    init_subtable();
    Format12 = class extends Subtable {
      constructor(p2, platformID, encodingID) {
        super(p2, platformID, encodingID);
        this.format = 12;
        p2.uint16;
        this.length = p2.uint32;
        this.language = p2.uint32;
        this.numGroups = p2.uint32;
        const getter = () => [...new Array(this.numGroups)].map((_) => new SequentialMapGroup2(p2));
        lazy(this, `groups`, getter);
      }
      supports(charCode) {
        if (charCode.charCodeAt)
          charCode = charCode.charCodeAt(0);
        if (55296 <= charCode && charCode <= 57343)
          return 0;
        if ((charCode & 65534) === 65534 || (charCode & 65535) === 65535)
          return 0;
        return this.groups.findIndex(
          (s) => s.startCharCode <= charCode && charCode <= s.endCharCode
        ) !== -1;
      }
      reverse(glyphID) {
        for (let group of this.groups) {
          let start = group.startGlyphID;
          if (start > glyphID)
            continue;
          if (start === glyphID)
            return group.startCharCode;
          let end = start + (group.endCharCode - group.startCharCode);
          if (end < glyphID)
            continue;
          const code = group.startCharCode + (glyphID - start);
          return { code, unicode: String.fromCodePoint(code) };
        }
        return {};
      }
      getSupportedCharCodes(preservePropNames = false) {
        if (preservePropNames)
          return this.groups;
        return this.groups.map((v) => ({
          start: v.startCharCode,
          end: v.endCharCode
        }));
      }
    };
    SequentialMapGroup2 = class {
      constructor(p2) {
        this.startCharCode = p2.uint32;
        this.endCharCode = p2.uint32;
        this.startGlyphID = p2.uint32;
      }
    };
  }
});

// src/opentype/tables/simple/cmap/format13.js
var Format13, ConstantMapGroup;
var init_format13 = __esm({
  "src/opentype/tables/simple/cmap/format13.js"() {
    init_lazy();
    init_subtable();
    Format13 = class extends Subtable {
      constructor(p2, platformID, encodingID) {
        super(p2, platformID, encodingID);
        this.format = 13;
        p2.uint16;
        this.length = p2.uint32;
        this.language = p2.uint32;
        this.numGroups = p2.uint32;
        const getter = [...new Array(this.numGroups)].map(
          (_) => new ConstantMapGroup(p2)
        );
        lazy(this, `groups`, getter);
      }
      supports(charCode) {
        if (charCode.charCodeAt)
          charCode = charCode.charCodeAt(0);
        return this.groups.findIndex(
          (s) => s.startCharCode <= charCode && charCode <= s.endCharCode
        ) !== -1;
      }
      reverse(glyphID) {
        console.warn(`reverse not implemented for cmap subtable format 13`);
        return {};
      }
      getSupportedCharCodes(preservePropNames = false) {
        if (preservePropNames)
          return this.groups;
        return this.groups.map((v) => ({
          start: v.startCharCode,
          end: v.endCharCode
        }));
      }
    };
    ConstantMapGroup = class {
      constructor(p2) {
        this.startCharCode = p2.uint32;
        this.endCharCode = p2.uint32;
        this.glyphID = p2.uint32;
      }
    };
  }
});

// src/opentype/tables/simple/cmap/format14.js
var Format14, VariationSelector;
var init_format14 = __esm({
  "src/opentype/tables/simple/cmap/format14.js"() {
    init_lazy();
    init_subtable();
    Format14 = class extends Subtable {
      constructor(p2, platformID, encodingID) {
        super(p2, platformID, encodingID);
        this.subTableStart = p2.currentPosition;
        this.format = 14;
        this.length = p2.uint32;
        this.numVarSelectorRecords = p2.uint32;
        lazy(
          this,
          `varSelectors`,
          () => [...new Array(this.numVarSelectorRecords)].map(
            (_) => new VariationSelector(p2)
          )
        );
      }
      supports() {
        console.warn(`supports not implemented for cmap subtable format 14`);
        return 0;
      }
      getSupportedCharCodes() {
        console.warn(
          `getSupportedCharCodes not implemented for cmap subtable format 14`
        );
        return [];
      }
      reverse(glyphID) {
        console.warn(`reverse not implemented for cmap subtable format 14`);
        return {};
      }
      supportsVariation(variation) {
        let v = this.varSelector.find((uvs) => uvs.varSelector === variation);
        return v ? v : false;
      }
      getSupportedVariations() {
        return this.varSelectors.map((v) => v.varSelector);
      }
    };
    VariationSelector = class {
      constructor(p2) {
        this.varSelector = p2.uint24;
        this.defaultUVSOffset = p2.Offset32;
        this.nonDefaultUVSOffset = p2.Offset32;
      }
    };
  }
});

// src/opentype/tables/simple/cmap/createSubTable.js
function createSubTable(parser, platformID, encodingID) {
  const format = parser.uint16;
  if (format === 0)
    return new Format0(parser, platformID, encodingID);
  if (format === 2)
    return new Format2(parser, platformID, encodingID);
  if (format === 4)
    return new Format4(parser, platformID, encodingID);
  if (format === 6)
    return new Format6(parser, platformID, encodingID);
  if (format === 8)
    return new Format8(parser, platformID, encodingID);
  if (format === 10)
    return new Format10(parser, platformID, encodingID);
  if (format === 12)
    return new Format12(parser, platformID, encodingID);
  if (format === 13)
    return new Format13(parser, platformID, encodingID);
  if (format === 14)
    return new Format14(parser, platformID, encodingID);
  return {};
}
var init_createSubTable = __esm({
  "src/opentype/tables/simple/cmap/createSubTable.js"() {
    init_format0();
    init_format2();
    init_format4();
    init_format6();
    init_format8();
    init_format10();
    init_format12();
    init_format13();
    init_format14();
  }
});

// src/opentype/tables/simple/cmap.js
var cmap_exports = {};
__export(cmap_exports, {
  cmap: () => cmap
});
var cmap, EncodingRecord;
var init_cmap = __esm({
  "src/opentype/tables/simple/cmap.js"() {
    init_simple_table();
    init_createSubTable();
    init_lazy();
    cmap = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.version = p2.uint16;
        this.numTables = p2.uint16;
        this.encodingRecords = [...new Array(this.numTables)].map(
          (_) => new EncodingRecord(p2, this.tableStart)
        );
      }
      getSubTable(tableID) {
        return this.encodingRecords[tableID].table;
      }
      getSupportedEncodings() {
        return this.encodingRecords.map((r) => ({
          platformID: r.platformID,
          encodingId: r.encodingID
        }));
      }
      getSupportedCharCodes(platformID, encodingID) {
        const recordID = this.encodingRecords.findIndex(
          (r) => r.platformID === platformID && r.encodingID === encodingID
        );
        if (recordID === -1)
          return false;
        const subtable = this.getSubTable(recordID);
        return subtable.getSupportedCharCodes();
      }
      reverse(glyphid) {
        for (let i = 0; i < this.numTables; i++) {
          let code = this.getSubTable(i).reverse(glyphid);
          if (code)
            return code;
        }
      }
      getGlyphId(char) {
        let last = 0;
        this.encodingRecords.some((_, tableID) => {
          let t = this.getSubTable(tableID);
          if (!t.getGlyphId)
            return false;
          last = t.getGlyphId(char);
          return last !== 0;
        });
        return last;
      }
      supports(char) {
        return this.encodingRecords.some((_, tableID) => {
          const t = this.getSubTable(tableID);
          return t.supports && t.supports(char) !== false;
        });
      }
      supportsVariation(variation) {
        return this.encodingRecords.some((_, tableID) => {
          const t = this.getSubTable(tableID);
          return t.supportsVariation && t.supportsVariation(variation) !== false;
        });
      }
    };
    EncodingRecord = class {
      constructor(p2, tableStart) {
        const platformID = this.platformID = p2.uint16;
        const encodingID = this.encodingID = p2.uint16;
        const offset = this.offset = p2.Offset32;
        lazy(this, `table`, () => {
          p2.currentPosition = tableStart + offset;
          return createSubTable(p2, platformID, encodingID);
        });
      }
    };
  }
});

// src/opentype/tables/simple/head.js
var head_exports = {};
__export(head_exports, {
  head: () => head
});
var head;
var init_head = __esm({
  "src/opentype/tables/simple/head.js"() {
    init_simple_table();
    head = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.load({
          majorVersion: p2.uint16,
          minorVersion: p2.uint16,
          fontRevision: p2.fixed,
          checkSumAdjustment: p2.uint32,
          magicNumber: p2.uint32,
          flags: p2.flags(16),
          unitsPerEm: p2.uint16,
          created: p2.longdatetime,
          modified: p2.longdatetime,
          xMin: p2.int16,
          yMin: p2.int16,
          xMax: p2.int16,
          yMax: p2.int16,
          macStyle: p2.flags(16),
          lowestRecPPEM: p2.uint16,
          fontDirectionHint: p2.uint16,
          indexToLocFormat: p2.uint16,
          glyphDataFormat: p2.uint16
        });
      }
    };
  }
});

// src/opentype/tables/simple/hhea.js
var hhea_exports = {};
__export(hhea_exports, {
  hhea: () => hhea
});
var hhea;
var init_hhea = __esm({
  "src/opentype/tables/simple/hhea.js"() {
    init_simple_table();
    hhea = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.majorVersion = p2.uint16;
        this.minorVersion = p2.uint16;
        this.ascender = p2.fword;
        this.descender = p2.fword;
        this.lineGap = p2.fword;
        this.advanceWidthMax = p2.ufword;
        this.minLeftSideBearing = p2.fword;
        this.minRightSideBearing = p2.fword;
        this.xMaxExtent = p2.fword;
        this.caretSlopeRise = p2.int16;
        this.caretSlopeRun = p2.int16;
        this.caretOffset = p2.int16;
        p2.int16;
        p2.int16;
        p2.int16;
        p2.int16;
        this.metricDataFormat = p2.int16;
        this.numberOfHMetrics = p2.uint16;
        p2.verifyLength();
      }
    };
  }
});

// src/opentype/tables/simple/hmtx.js
var hmtx_exports = {};
__export(hmtx_exports, {
  hmtx: () => hmtx
});
var hmtx, LongHorMetric;
var init_hmtx = __esm({
  "src/opentype/tables/simple/hmtx.js"() {
    init_simple_table();
    init_lazy();
    hmtx = class extends SimpleTable {
      constructor(dict, dataview, tables) {
        const { p: p2 } = super(dict, dataview);
        const numberOfHMetrics = tables.hhea.numberOfHMetrics;
        const numGlyphs = tables.maxp.numGlyphs;
        const metricsStart = p2.currentPosition;
        lazy(this, `hMetrics`, () => {
          p2.currentPosition = metricsStart;
          return [...new Array(numberOfHMetrics)].map(
            (_) => new LongHorMetric(p2.uint16, p2.int16)
          );
        });
        if (numberOfHMetrics < numGlyphs) {
          const lsbStart = metricsStart + numberOfHMetrics * 4;
          lazy(this, `leftSideBearings`, () => {
            p2.currentPosition = lsbStart;
            return [...new Array(numGlyphs - numberOfHMetrics)].map((_) => p2.int16);
          });
        }
      }
    };
    LongHorMetric = class {
      constructor(w, b) {
        this.advanceWidth = w;
        this.lsb = b;
      }
    };
  }
});

// src/opentype/tables/simple/maxp.js
var maxp_exports = {};
__export(maxp_exports, {
  maxp: () => maxp
});
var maxp;
var init_maxp = __esm({
  "src/opentype/tables/simple/maxp.js"() {
    init_simple_table();
    maxp = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.version = p2.legacyFixed;
        this.numGlyphs = p2.uint16;
        if (this.version === 1) {
          this.maxPoints = p2.uint16;
          this.maxContours = p2.uint16;
          this.maxCompositePoints = p2.uint16;
          this.maxCompositeContours = p2.uint16;
          this.maxZones = p2.uint16;
          this.maxTwilightPoints = p2.uint16;
          this.maxStorage = p2.uint16;
          this.maxFunctionDefs = p2.uint16;
          this.maxInstructionDefs = p2.uint16;
          this.maxStackElements = p2.uint16;
          this.maxSizeOfInstructions = p2.uint16;
          this.maxComponentElements = p2.uint16;
          this.maxComponentDepth = p2.uint16;
        }
        p2.verifyLength();
      }
    };
  }
});

// src/opentype/tables/simple/name.js
var name_exports = {};
__export(name_exports, {
  name: () => name
});
function decodeString(p2, record) {
  const { platformID, length } = record;
  if (length === 0)
    return ``;
  if (platformID === 0 || platformID === 3) {
    const str2 = [];
    for (let i = 0, e = length / 2; i < e; i++)
      str2[i] = String.fromCharCode(p2.uint16);
    return str2.join(``);
  }
  const bytes = p2.readBytes(length);
  const str = [];
  bytes.forEach(function(b, i) {
    str[i] = String.fromCharCode(b);
  });
  return str.join(``);
}
var name, LangTagRecord, NameRecord;
var init_name = __esm({
  "src/opentype/tables/simple/name.js"() {
    init_parser();
    init_simple_table();
    init_lazy();
    name = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.format = p2.uint16;
        this.count = p2.uint16;
        this.stringOffset = p2.Offset16;
        this.nameRecords = [...new Array(this.count)].map(
          (_) => new NameRecord(p2, this)
        );
        if (this.format === 1) {
          this.langTagCount = p2.uint16;
          this.langTagRecords = [...new Array(this.langTagCount)].map(
            (_) => new LangTagRecord(p2.uint16, p2.Offset16)
          );
        }
        this.stringStart = this.tableStart + this.stringOffset;
      }
      /**
       * Resolve a string by ID
       * @param {uint16} nameID the id used to find the name record to resolve.
       */
      get(nameID) {
        let record = this.nameRecords.find((record2) => record2.nameID === nameID);
        if (record)
          return record.string;
      }
    };
    LangTagRecord = class {
      constructor(length, offset) {
        this.length = length;
        this.offset = offset;
      }
    };
    NameRecord = class {
      constructor(p2, nameTable) {
        this.platformID = p2.uint16;
        this.encodingID = p2.uint16;
        this.languageID = p2.uint16;
        this.nameID = p2.uint16;
        this.length = p2.uint16;
        this.offset = p2.Offset16;
        lazy(this, `string`, () => {
          p2.currentPosition = nameTable.stringStart + this.offset;
          return decodeString(p2, this);
        });
      }
    };
  }
});

// src/opentype/tables/simple/OS2.js
var OS2_exports = {};
__export(OS2_exports, {
  OS2: () => OS2
});
var OS2;
var init_OS2 = __esm({
  "src/opentype/tables/simple/OS2.js"() {
    init_simple_table();
    OS2 = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.version = p2.uint16;
        this.xAvgCharWidth = p2.int16;
        this.usWeightClass = p2.uint16;
        this.usWidthClass = p2.uint16;
        this.fsType = p2.uint16;
        this.ySubscriptXSize = p2.int16;
        this.ySubscriptYSize = p2.int16;
        this.ySubscriptXOffset = p2.int16;
        this.ySubscriptYOffset = p2.int16;
        this.ySuperscriptXSize = p2.int16;
        this.ySuperscriptYSize = p2.int16;
        this.ySuperscriptXOffset = p2.int16;
        this.ySuperscriptYOffset = p2.int16;
        this.yStrikeoutSize = p2.int16;
        this.yStrikeoutPosition = p2.int16;
        this.sFamilyClass = p2.int16;
        this.panose = [...new Array(10)].map((_) => p2.uint8);
        this.ulUnicodeRange1 = p2.flags(32);
        this.ulUnicodeRange2 = p2.flags(32);
        this.ulUnicodeRange3 = p2.flags(32);
        this.ulUnicodeRange4 = p2.flags(32);
        this.achVendID = p2.tag;
        this.fsSelection = p2.uint16;
        this.usFirstCharIndex = p2.uint16;
        this.usLastCharIndex = p2.uint16;
        this.sTypoAscender = p2.int16;
        this.sTypoDescender = p2.int16;
        this.sTypoLineGap = p2.int16;
        this.usWinAscent = p2.uint16;
        this.usWinDescent = p2.uint16;
        if (this.version === 0)
          return p2.verifyLength();
        this.ulCodePageRange1 = p2.flags(32);
        this.ulCodePageRange2 = p2.flags(32);
        if (this.version === 1)
          return p2.verifyLength();
        this.sxHeight = p2.int16;
        this.sCapHeight = p2.int16;
        this.usDefaultChar = p2.uint16;
        this.usBreakChar = p2.uint16;
        this.usMaxContext = p2.uint16;
        if (this.version <= 4)
          return p2.verifyLength();
        this.usLowerOpticalPointSize = p2.uint16;
        this.usUpperOpticalPointSize = p2.uint16;
        if (this.version === 5)
          return p2.verifyLength();
      }
    };
  }
});

// src/opentype/tables/simple/post.js
var post_exports = {};
__export(post_exports, {
  post: () => post
});
var post, macStrings;
var init_post = __esm({
  "src/opentype/tables/simple/post.js"() {
    init_simple_table();
    post = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.version = p2.legacyFixed;
        this.italicAngle = p2.fixed;
        this.underlinePosition = p2.fword;
        this.underlineThickness = p2.fword;
        this.isFixedPitch = p2.uint32;
        this.minMemType42 = p2.uint32;
        this.maxMemType42 = p2.uint32;
        this.minMemType1 = p2.uint32;
        this.maxMemType1 = p2.uint32;
        if (this.version === 1 || this.version === 3)
          return p2.verifyLength();
        this.numGlyphs = p2.uint16;
        if (this.version === 2) {
          this.glyphNameIndex = [...new Array(this.numGlyphs)].map((_) => p2.uint16);
          this.namesOffset = p2.currentPosition;
          this.glyphNameOffsets = [1];
          for (let i = 0; i < this.numGlyphs; i++) {
            let index = this.glyphNameIndex[i];
            if (index < macStrings.length) {
              this.glyphNameOffsets.push(this.glyphNameOffsets[i]);
              continue;
            }
            let bytelength = p2.int8;
            p2.skip(bytelength);
            this.glyphNameOffsets.push(this.glyphNameOffsets[i] + bytelength + 1);
          }
        }
        if (this.version === 2.5) {
          this.offset = [...new Array(this.numGlyphs)].map((_) => p2.int8);
        }
      }
      getGlyphName(glyphid) {
        if (this.version !== 2) {
          console.warn(
            `post table version ${this.version} does not support glyph name lookups`
          );
          return ``;
        }
        let index = this.glyphNameIndex[glyphid];
        if (index < 258)
          return macStrings[index];
        let offset = this.glyphNameOffsets[glyphid];
        let next = this.glyphNameOffsets[glyphid + 1];
        let len = next - offset - 1;
        if (len === 0)
          return `.notdef.`;
        this.parser.currentPosition = this.namesOffset + offset;
        const data = this.parser.readBytes(len, this.namesOffset + offset, 8, true);
        return data.map((b) => String.fromCharCode(b)).join(``);
      }
    };
    macStrings = [
      `.notdef`,
      `.null`,
      `nonmarkingreturn`,
      `space`,
      `exclam`,
      `quotedbl`,
      `numbersign`,
      `dollar`,
      `percent`,
      `ampersand`,
      `quotesingle`,
      `parenleft`,
      `parenright`,
      `asterisk`,
      `plus`,
      `comma`,
      `hyphen`,
      `period`,
      `slash`,
      `zero`,
      `one`,
      `two`,
      `three`,
      `four`,
      `five`,
      `six`,
      `seven`,
      `eight`,
      `nine`,
      `colon`,
      `semicolon`,
      `less`,
      `equal`,
      `greater`,
      `question`,
      `at`,
      `A`,
      `B`,
      `C`,
      `D`,
      `E`,
      `F`,
      `G`,
      `H`,
      `I`,
      `J`,
      `K`,
      `L`,
      `M`,
      `N`,
      `O`,
      `P`,
      `Q`,
      `R`,
      `S`,
      `T`,
      `U`,
      `V`,
      `W`,
      `X`,
      `Y`,
      `Z`,
      `bracketleft`,
      `backslash`,
      `bracketright`,
      `asciicircum`,
      `underscore`,
      `grave`,
      `a`,
      `b`,
      `c`,
      `d`,
      `e`,
      `f`,
      `g`,
      `h`,
      `i`,
      `j`,
      `k`,
      `l`,
      `m`,
      `n`,
      `o`,
      `p`,
      `q`,
      `r`,
      `s`,
      `t`,
      `u`,
      `v`,
      `w`,
      `x`,
      `y`,
      `z`,
      `braceleft`,
      `bar`,
      `braceright`,
      `asciitilde`,
      `Adieresis`,
      `Aring`,
      `Ccedilla`,
      `Eacute`,
      `Ntilde`,
      `Odieresis`,
      `Udieresis`,
      `aacute`,
      `agrave`,
      `acircumflex`,
      `adieresis`,
      `atilde`,
      `aring`,
      `ccedilla`,
      `eacute`,
      `egrave`,
      `ecircumflex`,
      `edieresis`,
      `iacute`,
      `igrave`,
      `icircumflex`,
      `idieresis`,
      `ntilde`,
      `oacute`,
      `ograve`,
      `ocircumflex`,
      `odieresis`,
      `otilde`,
      `uacute`,
      `ugrave`,
      `ucircumflex`,
      `udieresis`,
      `dagger`,
      `degree`,
      `cent`,
      `sterling`,
      `section`,
      `bullet`,
      `paragraph`,
      `germandbls`,
      `registered`,
      `copyright`,
      `trademark`,
      `acute`,
      `dieresis`,
      `notequal`,
      `AE`,
      `Oslash`,
      `infinity`,
      `plusminus`,
      `lessequal`,
      `greaterequal`,
      `yen`,
      `mu`,
      `partialdiff`,
      `summation`,
      `product`,
      `pi`,
      `integral`,
      `ordfeminine`,
      `ordmasculine`,
      `Omega`,
      `ae`,
      `oslash`,
      `questiondown`,
      `exclamdown`,
      `logicalnot`,
      `radical`,
      `florin`,
      `approxequal`,
      `Delta`,
      `guillemotleft`,
      `guillemotright`,
      `ellipsis`,
      `nonbreakingspace`,
      `Agrave`,
      `Atilde`,
      `Otilde`,
      `OE`,
      `oe`,
      `endash`,
      `emdash`,
      `quotedblleft`,
      `quotedblright`,
      `quoteleft`,
      `quoteright`,
      `divide`,
      `lozenge`,
      `ydieresis`,
      `Ydieresis`,
      `fraction`,
      `currency`,
      `guilsinglleft`,
      `guilsinglright`,
      `fi`,
      `fl`,
      `daggerdbl`,
      `periodcentered`,
      `quotesinglbase`,
      `quotedblbase`,
      `perthousand`,
      `Acircumflex`,
      `Ecircumflex`,
      `Aacute`,
      `Edieresis`,
      `Egrave`,
      `Iacute`,
      `Icircumflex`,
      `Idieresis`,
      `Igrave`,
      `Oacute`,
      `Ocircumflex`,
      `apple`,
      `Ograve`,
      `Uacute`,
      `Ucircumflex`,
      `Ugrave`,
      `dotlessi`,
      `circumflex`,
      `tilde`,
      `macron`,
      `breve`,
      `dotaccent`,
      `ring`,
      `cedilla`,
      `hungarumlaut`,
      `ogonek`,
      `caron`,
      `Lslash`,
      `lslash`,
      `Scaron`,
      `scaron`,
      `Zcaron`,
      `zcaron`,
      `brokenbar`,
      `Eth`,
      `eth`,
      `Yacute`,
      `yacute`,
      `Thorn`,
      `thorn`,
      `minus`,
      `multiply`,
      `onesuperior`,
      `twosuperior`,
      `threesuperior`,
      `onehalf`,
      `onequarter`,
      `threequarters`,
      `franc`,
      `Gbreve`,
      `gbreve`,
      `Idotaccent`,
      `Scedilla`,
      `scedilla`,
      `Cacute`,
      `cacute`,
      `Ccaron`,
      `ccaron`,
      `dcroat`
    ];
  }
});

// src/opentype/tables/advanced/BASE.js
var BASE_exports = {};
__export(BASE_exports, {
  BASE: () => BASE
});
var BASE, AxisTable, BaseTagListTable, BaseScriptListTable, BaseScriptRecord, BaseScriptTable, BaseLangSysRecord, BaseValuesTable, MinMaxTable, FeatMinMaxRecord, BaseCoordTable;
var init_BASE = __esm({
  "src/opentype/tables/advanced/BASE.js"() {
    init_lazy();
    init_simple_table();
    BASE = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.majorVersion = p2.uint16;
        this.minorVersion = p2.uint16;
        this.horizAxisOffset = p2.Offset16;
        this.vertAxisOffset = p2.Offset16;
        lazy(
          this,
          `horizAxis`,
          () => new AxisTable({ offset: dict.offset + this.horizAxisOffset }, dataview)
        );
        lazy(
          this,
          `vertAxis`,
          () => new AxisTable({ offset: dict.offset + this.vertAxisOffset }, dataview)
        );
        if (this.majorVersion === 1 && this.minorVersion === 1) {
          this.itemVarStoreOffset = p2.Offset32;
          lazy(
            this,
            `itemVarStore`,
            () => new AxisTable(
              { offset: dict.offset + this.itemVarStoreOffset },
              dataview
            )
          );
        }
      }
    };
    AxisTable = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview, `AxisTable`);
        this.baseTagListOffset = p2.Offset16;
        this.baseScriptListOffset = p2.Offset16;
        lazy(
          this,
          `baseTagList`,
          () => new BaseTagListTable(
            { offset: dict.offset + this.baseTagListOffset },
            dataview
          )
        );
        lazy(
          this,
          `baseScriptList`,
          () => new BaseScriptListTable(
            { offset: dict.offset + this.baseScriptListOffset },
            dataview
          )
        );
      }
    };
    BaseTagListTable = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview, `BaseTagListTable`);
        this.baseTagCount = p2.uint16;
        this.baselineTags = [...new Array(this.baseTagCount)].map((_) => p2.tag);
      }
    };
    BaseScriptListTable = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview, `BaseScriptListTable`);
        this.baseScriptCount = p2.uint16;
        const recordStart = p2.currentPosition;
        lazy(this, `baseScriptRecords`, () => {
          p2.currentPosition = recordStart;
          return [...new Array(this.baseScriptCount)].map(
            (_) => new BaseScriptRecord(this.start, p2)
          );
        });
      }
    };
    BaseScriptRecord = class {
      constructor(baseScriptListTableStart, p2) {
        this.baseScriptTag = p2.tag;
        this.baseScriptOffset = p2.Offset16;
        lazy(this, `baseScriptTable`, () => {
          p2.currentPosition = baseScriptListTableStart + this.baseScriptOffset;
          return new BaseScriptTable(p2);
        });
      }
    };
    BaseScriptTable = class {
      constructor(p2) {
        this.start = p2.currentPosition;
        this.baseValuesOffset = p2.Offset16;
        this.defaultMinMaxOffset = p2.Offset16;
        this.baseLangSysCount = p2.uint16;
        this.baseLangSysRecords = [...new Array(this.baseLangSysCount)].map(
          (_) => new BaseLangSysRecord(this.start, p2)
        );
        lazy(this, `baseValues`, () => {
          p2.currentPosition = this.start + this.baseValuesOffset;
          return new BaseValuesTable(p2);
        });
        lazy(this, `defaultMinMax`, () => {
          p2.currentPosition = this.start + this.defaultMinMaxOffset;
          return new MinMaxTable(p2);
        });
      }
    };
    BaseLangSysRecord = class {
      constructor(baseScriptTableStart, p2) {
        this.baseLangSysTag = p2.tag;
        this.minMaxOffset = p2.Offset16;
        lazy(this, `minMax`, () => {
          p2.currentPosition = baseScriptTableStart + this.minMaxOffset;
          return new MinMaxTable(p2);
        });
      }
    };
    BaseValuesTable = class {
      constructor(p2) {
        this.parser = p2;
        this.start = p2.currentPosition;
        this.defaultBaselineIndex = p2.uint16;
        this.baseCoordCount = p2.uint16;
        this.baseCoords = [...new Array(this.baseCoordCount)].map(
          (_) => p2.Offset16
        );
      }
      getTable(id) {
        this.parser.currentPosition = this.start + this.baseCoords[id];
        return new BaseCoordTable(this.parser);
      }
    };
    MinMaxTable = class {
      constructor(p2) {
        this.minCoord = p2.Offset16;
        this.maxCoord = p2.Offset16;
        this.featMinMaxCount = p2.uint16;
        const recordStart = p2.currentPosition;
        lazy(this, `featMinMaxRecords`, () => {
          p2.currentPosition = recordStart;
          return [...new Array(this.featMinMaxCount)].map(
            (_) => new FeatMinMaxRecord(p2)
          );
        });
      }
    };
    FeatMinMaxRecord = class {
      constructor(p2) {
        this.featureTableTag = p2.tag;
        this.minCoord = p2.Offset16;
        this.maxCoord = p2.Offset16;
      }
    };
    BaseCoordTable = class {
      constructor(p2) {
        this.baseCoordFormat = p2.uint16;
        this.coordinate = p2.int16;
        if (this.baseCoordFormat === 2) {
          this.referenceGlyph = p2.uint16;
          this.baseCoordPoint = p2.uint16;
        }
        if (this.baseCoordFormat === 3) {
          this.deviceTable = p2.Offset16;
        }
      }
    };
  }
});

// src/opentype/tables/advanced/shared/class.js
var ClassDefinition, ClassRangeRecord;
var init_class = __esm({
  "src/opentype/tables/advanced/shared/class.js"() {
    ClassDefinition = class {
      constructor(p2) {
        this.classFormat = p2.uint16;
        if (this.classFormat === 1) {
          this.startGlyphID = p2.uint16;
          this.glyphCount = p2.uint16;
          this.classValueArray = [...new Array(this.glyphCount)].map(
            (_) => p2.uint16
          );
        }
        if (this.classFormat === 2) {
          this.classRangeCount = p2.uint16;
          this.classRangeRecords = [...new Array(this.classRangeCount)].map(
            (_) => new ClassRangeRecord(p2)
          );
        }
      }
    };
    ClassRangeRecord = class {
      constructor(p2) {
        this.startGlyphID = p2.uint16;
        this.endGlyphID = p2.uint16;
        this.class = p2.uint16;
      }
    };
  }
});

// src/opentype/tables/advanced/shared/coverage.js
var CoverageTable, CoverageRangeRecord;
var init_coverage = __esm({
  "src/opentype/tables/advanced/shared/coverage.js"() {
    init_parser();
    CoverageTable = class extends ParsedData {
      constructor(p2) {
        super(p2);
        this.coverageFormat = p2.uint16;
        if (this.coverageFormat === 1) {
          this.glyphCount = p2.uint16;
          this.glyphArray = [...new Array(this.glyphCount)].map((_) => p2.uint16);
        }
        if (this.coverageFormat === 2) {
          this.rangeCount = p2.uint16;
          this.rangeRecords = [...new Array(this.rangeCount)].map(
            (_) => new CoverageRangeRecord(p2)
          );
        }
      }
    };
    CoverageRangeRecord = class {
      constructor(p2) {
        this.startGlyphID = p2.uint16;
        this.endGlyphID = p2.uint16;
        this.startCoverageIndex = p2.uint16;
      }
    };
  }
});

// src/opentype/tables/advanced/shared/itemvariation.js
var ItemVariationStoreTable;
var init_itemvariation = __esm({
  "src/opentype/tables/advanced/shared/itemvariation.js"() {
    ItemVariationStoreTable = class {
      constructor(table, p2) {
        this.table = table;
        this.parser = p2;
        this.start = p2.currentPosition;
        this.format = p2.uint16;
        this.variationRegionListOffset = p2.Offset32;
        this.itemVariationDataCount = p2.uint16;
        this.itemVariationDataOffsets = [
          ...new Array(this.itemVariationDataCount)
        ].map((_) => p2.Offset32);
      }
    };
  }
});

// src/opentype/tables/advanced/GDEF.js
var GDEF_exports = {};
__export(GDEF_exports, {
  GDEF: () => GDEF
});
var GDEF, AttachList, AttachPoint, LigCaretList, LigGlyph, CaretValue, MarkGlyphSetsTable;
var init_GDEF = __esm({
  "src/opentype/tables/advanced/GDEF.js"() {
    init_parser();
    init_simple_table();
    init_class();
    init_coverage();
    init_itemvariation();
    init_lazy();
    GDEF = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.majorVersion = p2.uint16;
        this.minorVersion = p2.uint16;
        this.glyphClassDefOffset = p2.Offset16;
        lazy(this, `glyphClassDefs`, () => {
          if (this.glyphClassDefOffset === 0)
            return void 0;
          p2.currentPosition = this.tableStart + this.glyphClassDefOffset;
          return new ClassDefinition(p2);
        });
        this.attachListOffset = p2.Offset16;
        lazy(this, `attachList`, () => {
          if (this.attachListOffset === 0)
            return void 0;
          p2.currentPosition = this.tableStart + this.attachListOffset;
          return new AttachList(p2);
        });
        this.ligCaretListOffset = p2.Offset16;
        lazy(this, `ligCaretList`, () => {
          if (this.ligCaretListOffset === 0)
            return void 0;
          p2.currentPosition = this.tableStart + this.ligCaretListOffset;
          return new LigCaretList(p2);
        });
        this.markAttachClassDefOffset = p2.Offset16;
        lazy(this, `markAttachClassDef`, () => {
          if (this.markAttachClassDefOffset === 0)
            return void 0;
          p2.currentPosition = this.tableStart + this.markAttachClassDefOffset;
          return new ClassDefinition(p2);
        });
        if (this.minorVersion >= 2) {
          this.markGlyphSetsDefOffset = p2.Offset16;
          lazy(this, `markGlyphSetsDef`, () => {
            if (this.markGlyphSetsDefOffset === 0)
              return void 0;
            p2.currentPosition = this.tableStart + this.markGlyphSetsDefOffset;
            return new MarkGlyphSetsTable(p2);
          });
        }
        if (this.minorVersion === 3) {
          this.itemVarStoreOffset = p2.Offset32;
          lazy(this, `itemVarStore`, () => {
            if (this.itemVarStoreOffset === 0)
              return void 0;
            p2.currentPosition = this.tableStart + this.itemVarStoreOffset;
            return new ItemVariationStoreTable(p2);
          });
        }
      }
    };
    AttachList = class extends ParsedData {
      constructor(p2) {
        super(p2);
        this.coverageOffset = p2.Offset16;
        this.glyphCount = p2.uint16;
        this.attachPointOffsets = [...new Array(this.glyphCount)].map(
          (_) => p2.Offset16
        );
      }
      getPoint(pointID) {
        this.parser.currentPosition = this.start + this.attachPointOffsets[pointID];
        return new AttachPoint(this.parser);
      }
    };
    AttachPoint = class {
      constructor(p2) {
        this.pointCount = p2.uint16;
        this.pointIndices = [...new Array(this.pointCount)].map((_) => p2.uint16);
      }
    };
    LigCaretList = class extends ParsedData {
      constructor(p2) {
        super(p2);
        this.coverageOffset = p2.Offset16;
        lazy(this, `coverage`, () => {
          p2.currentPosition = this.start + this.coverageOffset;
          return new CoverageTable(p2);
        });
        this.ligGlyphCount = p2.uint16;
        this.ligGlyphOffsets = [...new Array(this.ligGlyphCount)].map(
          (_) => p2.Offset16
        );
      }
      getLigGlyph(ligGlyphID) {
        this.parser.currentPosition = this.start + this.ligGlyphOffsets[ligGlyphID];
        return new LigGlyph(this.parser);
      }
    };
    LigGlyph = class extends ParsedData {
      constructor(p2) {
        super(p2);
        this.caretCount = p2.uint16;
        this.caretValueOffsets = [...new Array(this.caretCount)].map(
          (_) => p2.Offset16
        );
      }
      getCaretValue(caretID) {
        this.parser.currentPosition = this.start + this.caretValueOffsets[caretID];
        return new CaretValue(this.parser);
      }
    };
    CaretValue = class {
      constructor(p2) {
        this.caretValueFormat = p2.uint16;
        if (this.caretValueFormat === 1) {
          this.coordinate = p2.int16;
        }
        if (this.caretValueFormat === 2) {
          this.caretValuePointIndex = p2.uint16;
        }
        if (this.caretValueFormat === 3) {
          this.coordinate = p2.int16;
          this.deviceOffset = p2.Offset16;
        }
      }
    };
    MarkGlyphSetsTable = class extends ParsedData {
      constructor(p2) {
        super(p2);
        this.markGlyphSetTableFormat = p2.uint16;
        this.markGlyphSetCount = p2.uint16;
        this.coverageOffsets = [...new Array(this.markGlyphSetCount)].map(
          (_) => p2.Offset32
        );
      }
      getMarkGlyphSet(markGlyphSetID) {
        this.parser.currentPosition = this.start + this.coverageOffsets[markGlyphSetID];
        return new CoverageTable(this.parser);
      }
    };
  }
});

// src/opentype/tables/advanced/shared/script.js
var ScriptList, ScriptRecord, ScriptTable, LangSysRecord, LangSysTable;
var init_script = __esm({
  "src/opentype/tables/advanced/shared/script.js"() {
    init_parser();
    ScriptList = class extends ParsedData {
      static EMPTY = {
        scriptCount: 0,
        scriptRecords: []
      };
      constructor(p2) {
        super(p2);
        this.scriptCount = p2.uint16;
        this.scriptRecords = [...new Array(this.scriptCount)].map(
          (_) => new ScriptRecord(p2)
        );
      }
    };
    ScriptRecord = class {
      constructor(p2) {
        this.scriptTag = p2.tag;
        this.scriptOffset = p2.Offset16;
      }
    };
    ScriptTable = class extends ParsedData {
      constructor(p2) {
        super(p2);
        this.defaultLangSys = p2.Offset16;
        this.langSysCount = p2.uint16;
        this.langSysRecords = [...new Array(this.langSysCount)].map(
          (_) => new LangSysRecord(p2)
        );
      }
    };
    LangSysRecord = class {
      constructor(p2) {
        this.langSysTag = p2.tag;
        this.langSysOffset = p2.Offset16;
      }
    };
    LangSysTable = class {
      constructor(p2) {
        this.lookupOrder = p2.Offset16;
        this.requiredFeatureIndex = p2.uint16;
        this.featureIndexCount = p2.uint16;
        this.featureIndices = [...new Array(this.featureIndexCount)].map(
          (_) => p2.uint16
        );
      }
    };
  }
});

// src/opentype/tables/advanced/shared/feature.js
var FeatureList, FeatureRecord, FeatureTable, CharacterVariant, Size, StylisticSet;
var init_feature = __esm({
  "src/opentype/tables/advanced/shared/feature.js"() {
    init_parser();
    FeatureList = class extends ParsedData {
      static EMPTY = {
        featureCount: 0,
        featureRecords: []
      };
      constructor(p2) {
        super(p2);
        this.featureCount = p2.uint16;
        this.featureRecords = [...new Array(this.featureCount)].map(
          (_) => new FeatureRecord(p2)
        );
      }
    };
    FeatureRecord = class {
      constructor(p2) {
        this.featureTag = p2.tag;
        this.featureOffset = p2.Offset16;
      }
    };
    FeatureTable = class extends ParsedData {
      constructor(p2) {
        super(p2);
        this.featureParams = p2.Offset16;
        this.lookupIndexCount = p2.uint16;
        this.lookupListIndices = [...new Array(this.lookupIndexCount)].map(
          (_) => p2.uint16
        );
      }
      // In order to parse the feature parameters, if there are any, we need to know which
      // feature this is, which is determined by the FeatureRecord.featureTag string.
      getFeatureParams() {
        if (this.featureParams > 0) {
          const p2 = this.parser;
          p2.currentPosition = this.start + this.featureParams;
          const tag = this.featureTag;
          if (tag === `size`)
            return new Size(p2);
          if (tag.startsWith(`cc`))
            return new CharacterVariant(p2);
          if (tag.startsWith(`ss`))
            return new StylisticSet(p2);
        }
      }
    };
    CharacterVariant = class {
      // See https://docs.microsoft.com/en-us/typography/opentype/spec/features_ae#tag-cv01--cv99
      constructor(p2) {
        this.format = p2.uint16;
        this.featUiLabelNameId = p2.uint16;
        this.featUiTooltipTextNameId = p2.uint16;
        this.sampleTextNameId = p2.uint16;
        this.numNamedParameters = p2.uint16;
        this.firstParamUiLabelNameId = p2.uint16;
        this.charCount = p2.uint16;
        this.character = [...new Array(this.charCount)].map((_) => p2.uint24);
      }
    };
    Size = class {
      // See https://docs.microsoft.com/en-us/typography/opentype/spec/features_pt#-tag-size
      constructor(p2) {
        this.designSize = p2.uint16;
        this.subfamilyIdentifier = p2.uint16;
        this.subfamilyNameID = p2.uint16;
        this.smallEnd = p2.uint16;
        this.largeEnd = p2.uint16;
      }
    };
    StylisticSet = class {
      // See https://docs.microsoft.com/en-us/typography/opentype/spec/features_pt#-tag-ss01---ss20
      constructor(p2) {
        this.version = p2.uint16;
        this.UINameID = p2.uint16;
      }
    };
  }
});

// src/opentype/tables/advanced/lookups/gsub/gsub-lookup.js
function undoCoverageOffsetParsing(instance) {
  instance.parser.currentPosition -= 2;
  delete instance.coverageOffset;
  delete instance.getCoverageTable;
}
var LookupType, SubstLookupRecord;
var init_gsub_lookup = __esm({
  "src/opentype/tables/advanced/lookups/gsub/gsub-lookup.js"() {
    init_parser();
    init_coverage();
    LookupType = class extends ParsedData {
      constructor(p2) {
        super(p2);
        this.substFormat = p2.uint16;
        this.coverageOffset = p2.Offset16;
      }
      getCoverageTable() {
        let p2 = this.parser;
        p2.currentPosition = this.start + this.coverageOffset;
        return new CoverageTable(p2);
      }
    };
    SubstLookupRecord = class {
      constructor(p2) {
        this.glyphSequenceIndex = p2.uint16;
        this.lookupListIndex = p2.uint16;
      }
    };
  }
});

// src/opentype/tables/advanced/lookups/gsub/lookup-type-1.js
var LookupType1;
var init_lookup_type_1 = __esm({
  "src/opentype/tables/advanced/lookups/gsub/lookup-type-1.js"() {
    init_gsub_lookup();
    LookupType1 = class extends LookupType {
      constructor(p2) {
        super(p2);
        this.deltaGlyphID = p2.int16;
      }
    };
  }
});

// src/opentype/tables/advanced/lookups/gsub/lookup-type-2.js
var LookupType2, SequenceTable;
var init_lookup_type_2 = __esm({
  "src/opentype/tables/advanced/lookups/gsub/lookup-type-2.js"() {
    init_gsub_lookup();
    LookupType2 = class extends LookupType {
      constructor(p2) {
        super(p2);
        this.sequenceCount = p2.uint16;
        this.sequenceOffsets = [...new Array(this.sequenceCount)].map(
          (_) => p2.Offset16
        );
      }
      getSequence(index) {
        let p2 = this.parser;
        p2.currentPosition = this.start + this.sequenceOffsets[index];
        return new SequenceTable(p2);
      }
    };
    SequenceTable = class {
      constructor(p2) {
        this.glyphCount = p2.uint16;
        this.substituteGlyphIDs = [...new Array(this.glyphCount)].map(
          (_) => p2.uint16
        );
      }
    };
  }
});

// src/opentype/tables/advanced/lookups/gsub/lookup-type-3.js
var LookupType3, AlternateSetTable;
var init_lookup_type_3 = __esm({
  "src/opentype/tables/advanced/lookups/gsub/lookup-type-3.js"() {
    init_gsub_lookup();
    LookupType3 = class extends LookupType {
      constructor(p2) {
        super(p2);
        this.alternateSetCount = p2.uint16;
        this.alternateSetOffsets = [...new Array(this.alternateSetCount)].map(
          (_) => p2.Offset16
        );
      }
      getAlternateSet(index) {
        let p2 = this.parser;
        p2.currentPosition = this.start + this.alternateSetOffsets[index];
        return new AlternateSetTable(p2);
      }
    };
    AlternateSetTable = class {
      constructor(p2) {
        this.glyphCount = p2.uint16;
        this.alternateGlyphIDs = [...new Array(this.glyphCount)].map(
          (_) => p2.uint16
        );
      }
    };
  }
});

// src/opentype/tables/advanced/lookups/gsub/lookup-type-4.js
var LookupType4, LigatureSetTable, LigatureTable;
var init_lookup_type_4 = __esm({
  "src/opentype/tables/advanced/lookups/gsub/lookup-type-4.js"() {
    init_parser();
    init_gsub_lookup();
    LookupType4 = class extends LookupType {
      constructor(p2) {
        super(p2);
        this.ligatureSetCount = p2.uint16;
        this.ligatureSetOffsets = [...new Array(this.ligatureSetCount)].map(
          (_) => p2.Offset16
        );
      }
      getLigatureSet(index) {
        let p2 = this.parser;
        p2.currentPosition = this.start + this.ligatureSetOffsets[index];
        return new LigatureSetTable(p2);
      }
    };
    LigatureSetTable = class extends ParsedData {
      constructor(p2) {
        super(p2);
        this.ligatureCount = p2.uint16;
        this.ligatureOffsets = [...new Array(this.ligatureCount)].map(
          (_) => p2.Offset16
        );
      }
      getLigature(index) {
        let p2 = this.parser;
        p2.currentPosition = this.start + this.ligatureOffsets[index];
        return new LigatureTable(p2);
      }
    };
    LigatureTable = class {
      constructor(p2) {
        this.ligatureGlyph = p2.uint16;
        this.componentCount = p2.uint16;
        this.componentGlyphIDs = [...new Array(this.componentCount - 1)].map(
          (_) => p2.uint16
        );
      }
    };
  }
});

// src/opentype/tables/advanced/lookups/gsub/lookup-type-5.js
var LookupType5, SubRuleSetTable, SubRuleTable, SubClassSetTable, SubClassRuleTable;
var init_lookup_type_5 = __esm({
  "src/opentype/tables/advanced/lookups/gsub/lookup-type-5.js"() {
    init_parser();
    init_gsub_lookup();
    init_coverage();
    LookupType5 = class extends LookupType {
      constructor(p2) {
        super(p2);
        if (this.substFormat === 1) {
          this.subRuleSetCount = p2.uint16;
          this.subRuleSetOffsets = [...new Array(this.subRuleSetCount)].map(
            (_) => p2.Offset16
          );
        }
        if (this.substFormat === 2) {
          this.classDefOffset = p2.Offset16;
          this.subClassSetCount = p2.uint16;
          this.subClassSetOffsets = [...new Array(this.subClassSetCount)].map(
            (_) => p2.Offset16
          );
        }
        if (this.substFormat === 3) {
          undoCoverageOffsetParsing(this);
          this.glyphCount = p2.uint16;
          this.substitutionCount = p2.uint16;
          this.coverageOffsets = [...new Array(this.glyphCount)].map(
            (_) => p2.Offset16
          );
          this.substLookupRecords = [...new Array(this.substitutionCount)].map(
            (_) => new SubstLookupRecord(p2)
          );
        }
      }
      getSubRuleSet(index) {
        if (this.substFormat !== 1)
          throw new Error(`lookup type 5.${this.substFormat} has no subrule sets.`);
        let p2 = this.parser;
        p2.currentPosition = this.start + this.subRuleSetOffsets[index];
        return new SubRuleSetTable(p2);
      }
      getSubClassSet(index) {
        if (this.substFormat !== 2)
          throw new Error(
            `lookup type 5.${this.substFormat} has no subclass sets.`
          );
        let p2 = this.parser;
        p2.currentPosition = this.start + this.subClassSetOffsets[index];
        return new SubClassSetTable(p2);
      }
      getCoverageTable(index) {
        if (this.substFormat !== 3 && !index)
          return super.getCoverageTable();
        if (!index)
          throw new Error(
            `lookup type 5.${this.substFormat} requires an coverage table index.`
          );
        let p2 = this.parser;
        p2.currentPosition = this.start + this.coverageOffsets[index];
        return new CoverageTable(p2);
      }
    };
    SubRuleSetTable = class extends ParsedData {
      constructor(p2) {
        super(p2);
        this.subRuleCount = p2.uint16;
        this.subRuleOffsets = [...new Array(this.subRuleCount)].map(
          (_) => p2.Offset16
        );
      }
      getSubRule(index) {
        let p2 = this.parser;
        p2.currentPosition = this.start + this.subRuleOffsets[index];
        return new SubRuleTable(p2);
      }
    };
    SubRuleTable = class {
      constructor(p2) {
        this.glyphCount = p2.uint16;
        this.substitutionCount = p2.uint16;
        this.inputSequence = [...new Array(this.glyphCount - 1)].map(
          (_) => p2.uint16
        );
        this.substLookupRecords = [...new Array(this.substitutionCount)].map(
          (_) => new SubstLookupRecord(p2)
        );
      }
    };
    SubClassSetTable = class extends ParsedData {
      constructor(p2) {
        super(p2);
        this.subClassRuleCount = p2.uint16;
        this.subClassRuleOffsets = [...new Array(this.subClassRuleCount)].map(
          (_) => p2.Offset16
        );
      }
      getSubClass(index) {
        let p2 = this.parser;
        p2.currentPosition = this.start + this.subClassRuleOffsets[index];
        return new SubClassRuleTable(p2);
      }
    };
    SubClassRuleTable = class extends SubRuleTable {
      constructor(p2) {
        super(p2);
      }
    };
  }
});

// src/opentype/tables/advanced/lookups/gsub/lookup-type-6.js
var LookupType6, ChainSubRuleSetTable, ChainSubRuleTable, ChainSubClassSetTable, ChainSubClassRuleTable, SequenceLookupRecord;
var init_lookup_type_6 = __esm({
  "src/opentype/tables/advanced/lookups/gsub/lookup-type-6.js"() {
    init_parser();
    init_gsub_lookup();
    init_coverage();
    LookupType6 = class extends LookupType {
      constructor(p2) {
        super(p2);
        if (this.substFormat === 1) {
          this.chainSubRuleSetCount = p2.uint16;
          this.chainSubRuleSetOffsets = [
            ...new Array(this.chainSubRuleSetCount)
          ].map((_) => p2.Offset16);
        }
        if (this.substFormat === 2) {
          this.backtrackClassDefOffset = p2.Offset16;
          this.inputClassDefOffset = p2.Offset16;
          this.lookaheadClassDefOffset = p2.Offset16;
          this.chainSubClassSetCount = p2.uint16;
          this.chainSubClassSetOffsets = [
            ...new Array(this.chainSubClassSetCount)
          ].map((_) => p2.Offset16);
        }
        if (this.substFormat === 3) {
          undoCoverageOffsetParsing(this);
          this.backtrackGlyphCount = p2.uint16;
          this.backtrackCoverageOffsets = [
            ...new Array(this.backtrackGlyphCount)
          ].map((_) => p2.Offset16);
          this.inputGlyphCount = p2.uint16;
          this.inputCoverageOffsets = [...new Array(this.inputGlyphCount)].map(
            (_) => p2.Offset16
          );
          this.lookaheadGlyphCount = p2.uint16;
          this.lookaheadCoverageOffsets = [
            ...new Array(this.lookaheadGlyphCount)
          ].map((_) => p2.Offset16);
          this.seqLookupCount = p2.uint16;
          this.seqLookupRecords = [...new Array(this.substitutionCount)].map(
            (_) => new SequenceLookupRecord(p2)
          );
        }
      }
      getChainSubRuleSet(index) {
        if (this.substFormat !== 1)
          throw new Error(
            `lookup type 6.${this.substFormat} has no chainsubrule sets.`
          );
        let p2 = this.parser;
        p2.currentPosition = this.start + this.chainSubRuleSetOffsets[index];
        return new ChainSubRuleSetTable(p2);
      }
      getChainSubClassSet(index) {
        if (this.substFormat !== 2)
          throw new Error(
            `lookup type 6.${this.substFormat} has no chainsubclass sets.`
          );
        let p2 = this.parser;
        p2.currentPosition = this.start + this.chainSubClassSetOffsets[index];
        return new ChainSubClassSetTable(p2);
      }
      getCoverageFromOffset(offset) {
        if (this.substFormat !== 3)
          throw new Error(
            `lookup type 6.${this.substFormat} does not use contextual coverage offsets.`
          );
        let p2 = this.parser;
        p2.currentPosition = this.start + offset;
        return new CoverageTable(p2);
      }
    };
    ChainSubRuleSetTable = class extends ParsedData {
      constructor(p2) {
        super(p2);
        this.chainSubRuleCount = p2.uint16;
        this.chainSubRuleOffsets = [...new Array(this.chainSubRuleCount)].map(
          (_) => p2.Offset16
        );
      }
      getSubRule(index) {
        let p2 = this.parser;
        p2.currentPosition = this.start + this.chainSubRuleOffsets[index];
        return new ChainSubRuleTable(p2);
      }
    };
    ChainSubRuleTable = class {
      constructor(p2) {
        this.backtrackGlyphCount = p2.uint16;
        this.backtrackSequence = [...new Array(this.backtrackGlyphCount)].map(
          (_) => p2.uint16
        );
        this.inputGlyphCount = p2.uint16;
        this.inputSequence = [...new Array(this.inputGlyphCount - 1)].map(
          (_) => p2.uint16
        );
        this.lookaheadGlyphCount = p2.uint16;
        this.lookAheadSequence = [...new Array(this.lookAheadGlyphCount)].map(
          (_) => p2.uint16
        );
        this.substitutionCount = p2.uint16;
        this.substLookupRecords = [...new Array(this.SubstCount)].map(
          (_) => new SubstLookupRecord(p2)
        );
      }
    };
    ChainSubClassSetTable = class extends ParsedData {
      constructor(p2) {
        super(p2);
        this.chainSubClassRuleCount = p2.uint16;
        this.chainSubClassRuleOffsets = [
          ...new Array(this.chainSubClassRuleCount)
        ].map((_) => p2.Offset16);
      }
      getSubClass(index) {
        let p2 = this.parser;
        p2.currentPosition = this.start + this.chainSubRuleOffsets[index];
        return new ChainSubClassRuleTable(p2);
      }
    };
    ChainSubClassRuleTable = class {
      constructor(p2) {
        this.backtrackGlyphCount = p2.uint16;
        this.backtrackSequence = [...new Array(this.backtrackGlyphCount)].map(
          (_) => p2.uint16
        );
        this.inputGlyphCount = p2.uint16;
        this.inputSequence = [...new Array(this.inputGlyphCount - 1)].map(
          (_) => p2.uint16
        );
        this.lookaheadGlyphCount = p2.uint16;
        this.lookAheadSequence = [...new Array(this.lookAheadGlyphCount)].map(
          (_) => p2.uint16
        );
        this.substitutionCount = p2.uint16;
        this.substLookupRecords = [...new Array(this.substitutionCount)].map(
          (_) => new SequenceLookupRecord(p2)
        );
      }
    };
    SequenceLookupRecord = class extends ParsedData {
      constructor(p2) {
        super(p2);
        this.sequenceIndex = p2.uint16;
        this.lookupListIndex = p2.uint16;
      }
    };
  }
});

// src/opentype/tables/advanced/lookups/gsub/lookup-type-7.js
var LookupType7;
var init_lookup_type_7 = __esm({
  "src/opentype/tables/advanced/lookups/gsub/lookup-type-7.js"() {
    init_parser();
    LookupType7 = class extends ParsedData {
      // note: not "extends LookupType"
      constructor(p2) {
        super(p2);
        this.substFormat = p2.uint16;
        this.extensionLookupType = p2.uint16;
        this.extensionOffset = p2.Offset32;
      }
    };
  }
});

// src/opentype/tables/advanced/lookups/gsub/lookup-type-8.js
var LookupType8;
var init_lookup_type_8 = __esm({
  "src/opentype/tables/advanced/lookups/gsub/lookup-type-8.js"() {
    init_gsub_lookup();
    LookupType8 = class extends LookupType {
      constructor(p2) {
        super(p2);
        this.backtrackGlyphCount = p2.uint16;
        this.backtrackCoverageOffsets = [
          ...new Array(this.backtrackGlyphCount)
        ].map((_) => p2.Offset16);
        this.lookaheadGlyphCount = p2.uint16;
        this.lookaheadCoverageOffsets = [new Array(this.lookaheadGlyphCount)].map(
          (_) => p2.Offset16
        );
        this.glyphCount = p2.uint16;
        this.substituteGlyphIDs = [...new Array(this.glyphCount)].map(
          (_) => p2.uint16
        );
      }
    };
  }
});

// src/opentype/tables/advanced/shared/subtables/gsub.js
var gsub_default;
var init_gsub = __esm({
  "src/opentype/tables/advanced/shared/subtables/gsub.js"() {
    init_lookup_type_1();
    init_lookup_type_2();
    init_lookup_type_3();
    init_lookup_type_4();
    init_lookup_type_5();
    init_lookup_type_6();
    init_lookup_type_7();
    init_lookup_type_8();
    gsub_default = {
      buildSubtable: function(type, p2) {
        const subtable = new [
          void 0,
          LookupType1,
          LookupType2,
          LookupType3,
          LookupType4,
          LookupType5,
          LookupType6,
          LookupType7,
          LookupType8
        ][type](p2);
        subtable.type = type;
        return subtable;
      }
    };
  }
});

// src/opentype/tables/advanced/lookups/gpos/gpos-lookup.js
var LookupType9;
var init_gpos_lookup = __esm({
  "src/opentype/tables/advanced/lookups/gpos/gpos-lookup.js"() {
    init_parser();
    LookupType9 = class extends ParsedData {
      constructor(p2) {
        super(p2);
      }
    };
  }
});

// src/opentype/tables/advanced/lookups/gpos/lookup-type-1.js
var LookupType12;
var init_lookup_type_12 = __esm({
  "src/opentype/tables/advanced/lookups/gpos/lookup-type-1.js"() {
    init_gpos_lookup();
    LookupType12 = class extends LookupType9 {
      constructor(p2) {
        super(p2);
        console.log(`lookup type 1`);
      }
    };
  }
});

// src/opentype/tables/advanced/lookups/gpos/lookup-type-2.js
var LookupType22;
var init_lookup_type_22 = __esm({
  "src/opentype/tables/advanced/lookups/gpos/lookup-type-2.js"() {
    init_gpos_lookup();
    LookupType22 = class extends LookupType9 {
      constructor(p2) {
        super(p2);
        console.log(`lookup type 2`);
      }
    };
  }
});

// src/opentype/tables/advanced/lookups/gpos/lookup-type-3.js
var LookupType32;
var init_lookup_type_32 = __esm({
  "src/opentype/tables/advanced/lookups/gpos/lookup-type-3.js"() {
    init_gpos_lookup();
    LookupType32 = class extends LookupType9 {
      constructor(p2) {
        super(p2);
        console.log(`lookup type 3`);
      }
    };
  }
});

// src/opentype/tables/advanced/lookups/gpos/lookup-type-4.js
var LookupType42;
var init_lookup_type_42 = __esm({
  "src/opentype/tables/advanced/lookups/gpos/lookup-type-4.js"() {
    init_gpos_lookup();
    LookupType42 = class extends LookupType9 {
      constructor(p2) {
        super(p2);
        console.log(`lookup type 4`);
      }
    };
  }
});

// src/opentype/tables/advanced/lookups/gpos/lookup-type-5.js
var LookupType52;
var init_lookup_type_52 = __esm({
  "src/opentype/tables/advanced/lookups/gpos/lookup-type-5.js"() {
    init_gpos_lookup();
    LookupType52 = class extends LookupType9 {
      constructor(p2) {
        super(p2);
        console.log(`lookup type 5`);
      }
    };
  }
});

// src/opentype/tables/advanced/lookups/gpos/lookup-type-6.js
var LookupType62;
var init_lookup_type_62 = __esm({
  "src/opentype/tables/advanced/lookups/gpos/lookup-type-6.js"() {
    init_gpos_lookup();
    LookupType62 = class extends LookupType9 {
      constructor(p2) {
        super(p2);
        console.log(`lookup type 6`);
      }
    };
  }
});

// src/opentype/tables/advanced/lookups/gpos/lookup-type-7.js
var LookupType72;
var init_lookup_type_72 = __esm({
  "src/opentype/tables/advanced/lookups/gpos/lookup-type-7.js"() {
    init_gpos_lookup();
    LookupType72 = class extends LookupType9 {
      constructor(p2) {
        super(p2);
        console.log(`lookup type 7`);
      }
    };
  }
});

// src/opentype/tables/advanced/lookups/gpos/lookup-type-8.js
var LookupType82;
var init_lookup_type_82 = __esm({
  "src/opentype/tables/advanced/lookups/gpos/lookup-type-8.js"() {
    init_gpos_lookup();
    LookupType82 = class extends LookupType9 {
      constructor(p2) {
        super(p2);
        console.log(`lookup type 8`);
      }
    };
  }
});

// src/opentype/tables/advanced/lookups/gpos/lookup-type-9.js
var LookupType92;
var init_lookup_type_9 = __esm({
  "src/opentype/tables/advanced/lookups/gpos/lookup-type-9.js"() {
    init_gpos_lookup();
    LookupType92 = class extends LookupType9 {
      constructor(p2) {
        super(p2);
        console.log(`lookup type 9`);
      }
    };
  }
});

// src/opentype/tables/advanced/shared/subtables/gpos.js
var gpos_default;
var init_gpos = __esm({
  "src/opentype/tables/advanced/shared/subtables/gpos.js"() {
    init_lookup_type_12();
    init_lookup_type_22();
    init_lookup_type_32();
    init_lookup_type_42();
    init_lookup_type_52();
    init_lookup_type_62();
    init_lookup_type_72();
    init_lookup_type_82();
    init_lookup_type_9();
    gpos_default = {
      buildSubtable: function(type, p2) {
        const subtable = new [
          void 0,
          LookupType12,
          LookupType22,
          LookupType32,
          LookupType42,
          LookupType52,
          LookupType62,
          LookupType72,
          LookupType82,
          LookupType92
        ][type](p2);
        subtable.type = type;
        return subtable;
      }
    };
  }
});

// src/opentype/tables/advanced/shared/lookup.js
var LookupList, LookupTable;
var init_lookup = __esm({
  "src/opentype/tables/advanced/shared/lookup.js"() {
    init_parser();
    init_gsub();
    init_gpos();
    LookupList = class extends ParsedData {
      static EMPTY = {
        lookupCount: 0,
        lookups: []
      };
      constructor(p2) {
        super(p2);
        this.lookupCount = p2.uint16;
        this.lookups = [...new Array(this.lookupCount)].map((_) => p2.Offset16);
      }
    };
    LookupTable = class extends ParsedData {
      constructor(p2, type) {
        super(p2);
        this.ctType = type;
        this.lookupType = p2.uint16;
        this.lookupFlag = p2.uint16;
        this.subTableCount = p2.uint16;
        this.subtableOffsets = [...new Array(this.subTableCount)].map(
          (_) => p2.Offset16
        );
        this.markFilteringSet = p2.uint16;
      }
      get rightToLeft() {
        return this.lookupFlag & true;
      }
      get ignoreBaseGlyphs() {
        return this.lookupFlag & true;
      }
      get ignoreLigatures() {
        return this.lookupFlag & true;
      }
      get ignoreMarks() {
        return this.lookupFlag & true;
      }
      get useMarkFilteringSet() {
        return this.lookupFlag & true;
      }
      get markAttachmentType() {
        return this.lookupFlag & true;
      }
      // FIXME: make this a lazy .subtables array instead?
      getSubTable(index) {
        const builder = this.ctType === `GSUB` ? gsub_default : gpos_default;
        this.parser.currentPosition = this.start + this.subtableOffsets[index];
        return builder.buildSubtable(this.lookupType, this.parser);
      }
    };
  }
});

// src/opentype/tables/common-layout-table.js
var CommonLayoutTable;
var init_common_layout_table = __esm({
  "src/opentype/tables/common-layout-table.js"() {
    init_simple_table();
    init_script();
    init_feature();
    init_lookup();
    init_lazy();
    CommonLayoutTable = class extends SimpleTable {
      constructor(dict, dataview, name2) {
        const { p: p2, tableStart } = super(dict, dataview, name2);
        this.majorVersion = p2.uint16;
        this.minorVersion = p2.uint16;
        this.scriptListOffset = p2.Offset16;
        this.featureListOffset = p2.Offset16;
        this.lookupListOffset = p2.Offset16;
        if (this.majorVersion === 1 && this.minorVersion === 1) {
          this.featureVariationsOffset = p2.Offset32;
        }
        const no_content = !(this.scriptListOffset || this.featureListOffset || this.lookupListOffset);
        lazy(this, `scriptList`, () => {
          if (no_content)
            return ScriptList.EMPTY;
          p2.currentPosition = tableStart + this.scriptListOffset;
          return new ScriptList(p2);
        });
        lazy(this, `featureList`, () => {
          if (no_content)
            return FeatureList.EMPTY;
          p2.currentPosition = tableStart + this.featureListOffset;
          return new FeatureList(p2);
        });
        lazy(this, `lookupList`, () => {
          if (no_content)
            return LookupList.EMPTY;
          p2.currentPosition = tableStart + this.lookupListOffset;
          return new LookupList(p2);
        });
        if (this.featureVariationsOffset) {
          lazy(this, `featureVariations`, () => {
            if (no_content)
              return FeatureVariations.EMPTY;
            p2.currentPosition = tableStart + this.featureVariationsOffset;
            return new FeatureVariations(p2);
          });
        }
      }
      // Script functions
      getSupportedScripts() {
        return this.scriptList.scriptRecords.map((r) => r.scriptTag);
      }
      getScriptTable(scriptTag) {
        let record = this.scriptList.scriptRecords.find(
          (r) => r.scriptTag === scriptTag
        );
        this.parser.currentPosition = this.scriptList.start + record.scriptOffset;
        let table = new ScriptTable(this.parser);
        table.scriptTag = scriptTag;
        return table;
      }
      // LangSys functions
      ensureScriptTable(arg) {
        if (typeof arg === "string") {
          return this.getScriptTable(arg);
        }
        return arg;
      }
      getSupportedLangSys(scriptTable) {
        scriptTable = this.ensureScriptTable(scriptTable);
        const hasDefault = scriptTable.defaultLangSys !== 0;
        const supported = scriptTable.langSysRecords.map((l) => l.langSysTag);
        if (hasDefault)
          supported.unshift(`dflt`);
        return supported;
      }
      getDefaultLangSysTable(scriptTable) {
        scriptTable = this.ensureScriptTable(scriptTable);
        let offset = scriptTable.defaultLangSys;
        if (offset !== 0) {
          this.parser.currentPosition = scriptTable.start + offset;
          let table = new LangSysTable(this.parser);
          table.langSysTag = ``;
          table.defaultForScript = scriptTable.scriptTag;
          return table;
        }
      }
      getLangSysTable(scriptTable, langSysTag = `dflt`) {
        if (langSysTag === `dflt`)
          return this.getDefaultLangSysTable(scriptTable);
        scriptTable = this.ensureScriptTable(scriptTable);
        let record = scriptTable.langSysRecords.find(
          (l) => l.langSysTag === langSysTag
        );
        this.parser.currentPosition = scriptTable.start + record.langSysOffset;
        let table = new LangSysTable(this.parser);
        table.langSysTag = langSysTag;
        return table;
      }
      // Feature functions
      getFeatures(langSysTable) {
        return langSysTable.featureIndices.map((index) => this.getFeature(index));
      }
      getFeature(indexOrTag) {
        let record;
        if (parseInt(indexOrTag) == indexOrTag) {
          record = this.featureList.featureRecords[indexOrTag];
        } else {
          record = this.featureList.featureRecords.find(
            (f) => f.featureTag === indexOrTag
          );
        }
        if (!record)
          return;
        this.parser.currentPosition = this.featureList.start + record.featureOffset;
        let table = new FeatureTable(this.parser);
        table.featureTag = record.featureTag;
        return table;
      }
      // Lookup functions
      getLookups(featureTable) {
        return featureTable.lookupListIndices.map((index) => this.getLookup(index));
      }
      getLookup(lookupIndex, type) {
        let lookupOffset = this.lookupList.lookups[lookupIndex];
        this.parser.currentPosition = this.lookupList.start + lookupOffset;
        return new LookupTable(this.parser, type);
      }
    };
  }
});

// src/opentype/tables/advanced/GSUB.js
var GSUB_exports = {};
__export(GSUB_exports, {
  GSUB: () => GSUB
});
var GSUB;
var init_GSUB = __esm({
  "src/opentype/tables/advanced/GSUB.js"() {
    init_common_layout_table();
    GSUB = class extends CommonLayoutTable {
      constructor(dict, dataview) {
        super(dict, dataview, `GSUB`);
      }
      getLookup(lookupIndex) {
        return super.getLookup(lookupIndex, `GSUB`);
      }
    };
  }
});

// src/opentype/tables/advanced/GPOS.js
var GPOS_exports = {};
__export(GPOS_exports, {
  GPOS: () => GPOS
});
var GPOS;
var init_GPOS = __esm({
  "src/opentype/tables/advanced/GPOS.js"() {
    init_common_layout_table();
    GPOS = class extends CommonLayoutTable {
      constructor(dict, dataview) {
        super(dict, dataview, `GPOS`);
      }
      getLookup(lookupIndex) {
        return super.getLookup(lookupIndex, `GPOS`);
      }
    };
  }
});

// src/opentype/tables/simple/SVG.js
var SVG_exports = {};
__export(SVG_exports, {
  SVG: () => SVG
});
var SVG, SVGDocumentList, SVGDocumentRecord;
var init_SVG = __esm({
  "src/opentype/tables/simple/SVG.js"() {
    init_parser();
    init_simple_table();
    SVG = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.version = p2.uint16;
        this.offsetToSVGDocumentList = p2.Offset32;
        p2.currentPosition = this.tableStart + this.offsetToSVGDocumentList;
        this.documentList = new SVGDocumentList(p2);
      }
    };
    SVGDocumentList = class extends ParsedData {
      constructor(p2) {
        super(p2);
        this.numEntries = p2.uint16;
        this.documentRecords = [...new Array(this.numEntries)].map(
          (_) => new SVGDocumentRecord(p2)
        );
      }
      /**
       * Get an SVG document by ID
       */
      getDocument(documentID) {
        let record = this.documentRecords[documentID];
        if (!record)
          return "";
        let offset = this.start + record.svgDocOffset;
        this.parser.currentPosition = offset;
        return this.parser.readBytes(record.svgDocLength);
      }
      /**
       * Get an SVG document given a glyphID
       */
      getDocumentForGlyph(glyphID) {
        let id = this.documentRecords.findIndex(
          (d) => d.startGlyphID <= glyphID && glyphID <= d.endGlyphID
        );
        if (id === -1)
          return "";
        return this.getDocument(id);
      }
    };
    SVGDocumentRecord = class {
      constructor(p2) {
        this.startGlyphID = p2.uint16;
        this.endGlyphID = p2.uint16;
        this.svgDocOffset = p2.Offset32;
        this.svgDocLength = p2.uint32;
      }
    };
  }
});

// src/opentype/tables/simple/variation/fvar.js
var fvar_exports = {};
__export(fvar_exports, {
  fvar: () => fvar
});
var fvar, VariationAxisRecord, InstanceRecord;
var init_fvar = __esm({
  "src/opentype/tables/simple/variation/fvar.js"() {
    init_simple_table();
    init_lazy();
    fvar = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.majorVersion = p2.uint16;
        this.minorVersion = p2.uint16;
        this.axesArrayOffset = p2.Offset16;
        p2.uint16;
        this.axisCount = p2.uint16;
        this.axisSize = p2.uint16;
        this.instanceCount = p2.uint16;
        this.instanceSize = p2.uint16;
        const axisStart = this.tableStart + this.axesArrayOffset;
        lazy(this, `axes`, () => {
          p2.currentPosition = axisStart;
          return [...new Array(this.axisCount)].map(
            (_) => new VariationAxisRecord(p2)
          );
        });
        const instanceStart = axisStart + this.axisCount * this.axisSize;
        lazy(this, `instances`, () => {
          let instances = [];
          for (let i = 0; i < this.instanceCount; i++) {
            p2.currentPosition = instanceStart + i * this.instanceSize;
            instances.push(
              new InstanceRecord(p2, this.axisCount, this.instanceSize)
            );
          }
          return instances;
        });
      }
      getSupportedAxes() {
        return this.axes.map((a) => a.tag);
      }
      getAxis(name2) {
        return this.axes.find((a) => a.tag === name2);
      }
    };
    VariationAxisRecord = class {
      constructor(p2) {
        this.tag = p2.tag;
        this.minValue = p2.fixed;
        this.defaultValue = p2.fixed;
        this.maxValue = p2.fixed;
        this.flags = p2.flags(16);
        this.axisNameID = p2.uint16;
      }
    };
    InstanceRecord = class {
      constructor(p2, axisCount, size) {
        let start = p2.currentPosition;
        this.subfamilyNameID = p2.uint16;
        p2.uint16;
        this.coordinates = [...new Array(axisCount)].map((_) => p2.fixed);
        if (p2.currentPosition - start < size) {
          this.postScriptNameID = p2.uint16;
        }
      }
    };
  }
});

// src/opentype/tables/simple/ttf/cvt.js
var cvt_exports = {};
__export(cvt_exports, {
  cvt: () => cvt
});
var cvt;
var init_cvt = __esm({
  "src/opentype/tables/simple/ttf/cvt.js"() {
    init_simple_table();
    init_lazy();
    cvt = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        const n = dict.length / 2;
        lazy(this, `items`, () => [...new Array(n)].map((_) => p2.fword));
      }
    };
  }
});

// src/opentype/tables/simple/ttf/fpgm.js
var fpgm_exports = {};
__export(fpgm_exports, {
  fpgm: () => fpgm
});
var fpgm;
var init_fpgm = __esm({
  "src/opentype/tables/simple/ttf/fpgm.js"() {
    init_simple_table();
    init_lazy();
    fpgm = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        lazy(
          this,
          `instructions`,
          () => [...new Array(dict.length)].map((_) => p2.uint8)
        );
      }
    };
  }
});

// src/opentype/tables/simple/ttf/gasp.js
var gasp_exports = {};
__export(gasp_exports, {
  gasp: () => gasp
});
var gasp, GASPRange;
var init_gasp = __esm({
  "src/opentype/tables/simple/ttf/gasp.js"() {
    init_simple_table();
    init_lazy();
    gasp = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.version = p2.uint16;
        this.numRanges = p2.uint16;
        const getter = () => [...new Array(this.numRanges)].map((_) => new GASPRange(p2));
        lazy(this, `gaspRanges`, getter);
      }
    };
    GASPRange = class {
      constructor(p2) {
        this.rangeMaxPPEM = p2.uint16;
        this.rangeGaspBehavior = p2.uint16;
      }
    };
  }
});

// src/opentype/tables/simple/ttf/glyf.js
var glyf_exports = {};
__export(glyf_exports, {
  glyf: () => glyf
});
var glyf;
var init_glyf = __esm({
  "src/opentype/tables/simple/ttf/glyf.js"() {
    init_simple_table();
    glyf = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
      }
      getGlyphData(offset, length) {
        this.parser.currentPosition = this.tableStart + offset;
        return this.parser.readBytes(length);
      }
    };
  }
});

// src/opentype/tables/simple/ttf/loca.js
var loca_exports = {};
__export(loca_exports, {
  loca: () => loca
});
var loca;
var init_loca = __esm({
  "src/opentype/tables/simple/ttf/loca.js"() {
    init_simple_table();
    init_lazy();
    loca = class extends SimpleTable {
      constructor(dict, dataview, tables) {
        const { p: p2 } = super(dict, dataview);
        const n = tables.maxp.numGlyphs + 1;
        if (tables.head.indexToLocFormat === 0) {
          this.x2 = true;
          lazy(this, `offsets`, () => [...new Array(n)].map((_) => p2.Offset16));
        } else {
          lazy(this, `offsets`, () => [...new Array(n)].map((_) => p2.Offset32));
        }
      }
      getGlyphDataOffsetAndLength(glyphID) {
        let offset = this.offsets[glyphID] * this.x2 ? 2 : 1;
        let nextOffset = this.offsets[glyphID + 1] * this.x2 ? 2 : 1;
        return { offset, length: nextOffset - offset };
      }
    };
  }
});

// src/opentype/tables/simple/ttf/prep.js
var prep_exports = {};
__export(prep_exports, {
  prep: () => prep
});
var prep;
var init_prep = __esm({
  "src/opentype/tables/simple/ttf/prep.js"() {
    init_simple_table();
    init_lazy();
    prep = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        lazy(
          this,
          `instructions`,
          () => [...new Array(dict.length)].map((_) => p2.uint8)
        );
      }
    };
  }
});

// src/opentype/tables/simple/cff/CFF.js
var CFF_exports = {};
__export(CFF_exports, {
  CFF: () => CFF
});
var CFF;
var init_CFF = __esm({
  "src/opentype/tables/simple/cff/CFF.js"() {
    init_simple_table();
    init_lazy();
    CFF = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        lazy(this, `data`, () => p2.readBytes());
      }
    };
  }
});

// src/opentype/tables/simple/cff/CFF2.js
var CFF2_exports = {};
__export(CFF2_exports, {
  CFF2: () => CFF2
});
var CFF2;
var init_CFF2 = __esm({
  "src/opentype/tables/simple/cff/CFF2.js"() {
    init_simple_table();
    init_lazy();
    CFF2 = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        lazy(this, `data`, () => p2.readBytes());
      }
    };
  }
});

// src/opentype/tables/simple/cff/VORG.js
var VORG_exports = {};
__export(VORG_exports, {
  VORG: () => VORG
});
var VORG, VertOriginYMetric;
var init_VORG = __esm({
  "src/opentype/tables/simple/cff/VORG.js"() {
    init_simple_table();
    init_lazy();
    VORG = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.majorVersion = p2.uint16;
        this.minorVersion = p2.uint16;
        this.defaultVertOriginY = p2.int16;
        this.numVertOriginYMetrics = p2.uint16;
        lazy(
          this,
          `vertORiginYMetrics`,
          () => [...new Array(this.numVertOriginYMetrics)].map(
            (_) => new VertOriginYMetric(p2)
          )
        );
      }
    };
    VertOriginYMetric = class {
      constructor(p2) {
        this.glyphIndex = p2.uint16;
        this.vertOriginY = p2.int16;
      }
    };
  }
});

// src/opentype/tables/simple/bitmap/shared.js
var BitmapSize, BitmapScale, SbitLineMetrics;
var init_shared = __esm({
  "src/opentype/tables/simple/bitmap/shared.js"() {
    BitmapSize = class {
      constructor(p2) {
        this.indexSubTableArrayOffset = p2.Offset32;
        this.indexTablesSize = p2.uint32;
        this.numberofIndexSubTables = p2.uint32;
        this.colorRef = p2.uint32;
        this.hori = new SbitLineMetrics(p2);
        this.vert = new SbitLineMetrics(p2);
        this.startGlyphIndex = p2.uint16;
        this.endGlyphIndex = p2.uint16;
        this.ppemX = p2.uint8;
        this.ppemY = p2.uint8;
        this.bitDepth = p2.uint8;
        this.flags = p2.int8;
      }
    };
    BitmapScale = class {
      constructor(p2) {
        this.hori = new SbitLineMetrics(p2);
        this.vert = new SbitLineMetrics(p2);
        this.ppemX = p2.uint8;
        this.ppemY = p2.uint8;
        this.substitutePpemX = p2.uint8;
        this.substitutePpemY = p2.uint8;
      }
    };
    SbitLineMetrics = class {
      constructor(p2) {
        this.ascender = p2.int8;
        this.descender = p2.int8;
        this.widthMax = p2.uint8;
        this.caretSlopeNumerator = p2.int8;
        this.caretSlopeDenominator = p2.int8;
        this.caretOffset = p2.int8;
        this.minOriginSB = p2.int8;
        this.minAdvanceSB = p2.int8;
        this.maxBeforeBL = p2.int8;
        this.minAfterBL = p2.int8;
        this.pad1 = p2.int8;
        this.pad2 = p2.int8;
      }
    };
  }
});

// src/opentype/tables/simple/bitmap/EBLC.js
var EBLC_exports = {};
__export(EBLC_exports, {
  EBLC: () => EBLC
});
var EBLC;
var init_EBLC = __esm({
  "src/opentype/tables/simple/bitmap/EBLC.js"() {
    init_shared();
    init_simple_table();
    init_lazy();
    EBLC = class extends SimpleTable {
      constructor(dict, dataview, name2) {
        const { p: p2 } = super(dict, dataview, name2);
        this.majorVersion = p2.uint16;
        this.minorVersion = p2.uint16;
        this.numSizes = p2.uint32;
        lazy(
          this,
          `bitMapSizes`,
          () => [...new Array(this.numSizes)].map((_) => new BitmapSize(p2))
        );
      }
    };
  }
});

// src/opentype/tables/simple/bitmap/EBDT.js
var EBDT_exports = {};
__export(EBDT_exports, {
  EBDT: () => EBDT
});
var EBDT;
var init_EBDT = __esm({
  "src/opentype/tables/simple/bitmap/EBDT.js"() {
    init_simple_table();
    EBDT = class extends SimpleTable {
      constructor(dict, dataview, name2) {
        const { p: p2 } = super(dict, dataview, name2);
        this.majorVersion = p2.uint16;
        this.minorVersion = p2.uint16;
      }
      // TODO: add a way to get the data out
    };
  }
});

// src/opentype/tables/simple/bitmap/EBSC.js
var EBSC_exports = {};
__export(EBSC_exports, {
  EBSC: () => EBSC
});
var EBSC;
var init_EBSC = __esm({
  "src/opentype/tables/simple/bitmap/EBSC.js"() {
    init_shared();
    init_simple_table();
    init_lazy();
    EBSC = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.majorVersion = p2.uint16;
        this.minorVersion = p2.uint16;
        this.numSizes = p2.uint32;
        lazy(
          this,
          `bitmapScales`,
          () => [...new Array(this.numSizes)].map((_) => new BitmapScale(p2))
        );
      }
    };
  }
});

// src/opentype/tables/simple/bitmap/CBLC.js
var CBLC_exports = {};
__export(CBLC_exports, {
  CBLC: () => CBLC
});
var CBLC;
var init_CBLC = __esm({
  "src/opentype/tables/simple/bitmap/CBLC.js"() {
    init_EBLC();
    CBLC = class extends EBLC {
      constructor(dict, dataview) {
        super(dict, dataview, `CBLC`);
      }
    };
  }
});

// src/opentype/tables/simple/bitmap/CBDT.js
var CBDT_exports = {};
__export(CBDT_exports, {
  CBDT: () => CBDT
});
var CBDT;
var init_CBDT = __esm({
  "src/opentype/tables/simple/bitmap/CBDT.js"() {
    init_EBDT();
    CBDT = class extends EBDT {
      constructor(dict, dataview) {
        super(dict, dataview, `CBDT`);
      }
      // TODO: In addition to nine different formats already defined for glyph bitmap data in the EBDT table, there are three more formats
    };
  }
});

// src/opentype/tables/simple/bitmap/sbix.js
var sbix_exports = {};
__export(sbix_exports, {
  sbix: () => sbix
});
var sbix;
var init_sbix = __esm({
  "src/opentype/tables/simple/bitmap/sbix.js"() {
    init_parser();
    init_simple_table();
    init_lazy();
    sbix = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.version = p2.uint16;
        this.flags = p2.flags(16);
        this.numStrikes = p2.uint32;
        lazy(
          this,
          `strikeOffsets`,
          () => [...new Array(this.numStrikes)].map((_) => p2.Offset32)
        );
      }
      // TODO: add a strike accessor
    };
  }
});

// src/opentype/tables/simple/color/COLR.js
var COLR_exports = {};
__export(COLR_exports, {
  COLR: () => COLR
});
var COLR, BaseGlyphRecord, LayerRecord;
var init_COLR = __esm({
  "src/opentype/tables/simple/color/COLR.js"() {
    init_simple_table();
    COLR = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.version = p2.uint16;
        this.numBaseGlyphRecords = p2.uint16;
        this.baseGlyphRecordsOffset = p2.Offset32;
        this.layerRecordsOffset = p2.Offset32;
        this.numLayerRecords = p2.uint16;
      }
      getBaseGlyphRecord(glyphID) {
        let start = this.tableStart + this.baseGlyphRecordsOffset;
        this.parser.currentPosition = start;
        let first = new BaseGlyphRecord(this.parser);
        let firstID = first.gID;
        let end = this.tableStart + this.layerRecordsOffset - 6;
        this.parser.currentPosition = end;
        let last = new BaseGlyphRecord(this.parser);
        let lastID = last.gID;
        if (firstID === glyphID)
          return first;
        if (lastID === glyphID)
          return last;
        while (true) {
          if (start === end)
            break;
          let mid = start + (end - start) / 12;
          this.parser.currentPosition = mid;
          let middle = new BaseGlyphRecord(this.parser);
          let midID = middle.gID;
          if (midID === glyphID)
            return middle;
          else if (midID > glyphID) {
            end = mid;
          } else if (midID < glyphID) {
            start = mid;
          }
        }
        return false;
      }
      getLayers(glyphID) {
        let record = this.getBaseGlyphRecord(glyphID);
        this.parser.currentPosition = this.tableStart + this.layerRecordsOffset + 4 * record.firstLayerIndex;
        return [...new Array(record.numLayers)].map((_) => new LayerRecord(p));
      }
    };
    BaseGlyphRecord = class {
      constructor(p2) {
        this.gID = p2.uint16;
        this.firstLayerIndex = p2.uint16;
        this.numLayers = p2.uint16;
      }
    };
    LayerRecord = class {
      constructor(p2) {
        this.gID = p2.uint16;
        this.paletteIndex = p2.uint16;
      }
    };
  }
});

// src/opentype/tables/simple/color/CPAL.js
var CPAL_exports = {};
__export(CPAL_exports, {
  CPAL: () => CPAL
});
var CPAL, ColorRecord, PaletteTypeArray, PaletteLabelsArray, PaletteEntryLabelArray;
var init_CPAL = __esm({
  "src/opentype/tables/simple/color/CPAL.js"() {
    init_simple_table();
    init_lazy();
    CPAL = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.version = p2.uint16;
        this.numPaletteEntries = p2.uint16;
        const numPalettes = this.numPalettes = p2.uint16;
        this.numColorRecords = p2.uint16;
        this.offsetFirstColorRecord = p2.Offset32;
        this.colorRecordIndices = [...new Array(this.numPalettes)].map(
          (_) => p2.uint16
        );
        lazy(this, `colorRecords`, () => {
          p2.currentPosition = this.tableStart + this.offsetFirstColorRecord;
          return [...new Array(this.numColorRecords)].map(
            (_) => new ColorRecord(p2)
          );
        });
        if (this.version === 1) {
          this.offsetPaletteTypeArray = p2.Offset32;
          this.offsetPaletteLabelArray = p2.Offset32;
          this.offsetPaletteEntryLabelArray = p2.Offset32;
          lazy(this, `paletteTypeArray`, () => {
            p2.currentPosition = this.tableStart + this.offsetPaletteTypeArray;
            return new PaletteTypeArray(p2, numPalettes);
          });
          lazy(this, `paletteLabelArray`, () => {
            p2.currentPosition = this.tableStart + this.offsetPaletteLabelArray;
            return new PaletteLabelsArray(p2, numPalettes);
          });
          lazy(this, `paletteEntryLabelArray`, () => {
            p2.currentPosition = this.tableStart + this.offsetPaletteEntryLabelArray;
            return new PaletteEntryLabelArray(p2, numPalettes);
          });
        }
      }
    };
    ColorRecord = class {
      constructor(p2) {
        this.blue = p2.uint8;
        this.green = p2.uint8;
        this.red = p2.uint8;
        this.alpha = p2.uint8;
      }
    };
    PaletteTypeArray = class {
      constructor(p2, numPalettes) {
        this.paletteTypes = [...new Array(numPalettes)].map((_) => p2.uint32);
      }
    };
    PaletteLabelsArray = class {
      constructor(p2, numPalettes) {
        this.paletteLabels = [...new Array(numPalettes)].map((_) => p2.uint16);
      }
    };
    PaletteEntryLabelArray = class {
      constructor(p2, numPalettes) {
        this.paletteEntryLabels = [...new Array(numPalettes)].map((_) => p2.uint16);
      }
    };
  }
});

// src/opentype/tables/simple/other/DSIG.js
var DSIG_exports = {};
__export(DSIG_exports, {
  DSIG: () => DSIG
});
var DSIG, SignatureRecord, SignatureBlockFormat1;
var init_DSIG = __esm({
  "src/opentype/tables/simple/other/DSIG.js"() {
    init_simple_table();
    DSIG = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.version = p2.uint32;
        this.numSignatures = p2.uint16;
        this.flags = p2.uint16;
        this.signatureRecords = [...new Array(this.numSignatures)].map(
          (_) => new SignatureRecord(p2)
        );
      }
      getData(signatureID) {
        const record = this.signatureRecords[signatureID];
        this.parser.currentPosition = this.tableStart + record.offset;
        return new SignatureBlockFormat1(this.parser);
      }
    };
    SignatureRecord = class {
      constructor(p2) {
        this.format = p2.uint32;
        this.length = p2.uint32;
        this.offset = p2.Offset32;
      }
    };
    SignatureBlockFormat1 = class {
      // "Signature blocks may have various formats; currently one format is defined."
      // There is so much optimism here. There might be more formats! We should reserve
      // _multiple_ uint16! We have BIG PLANS! ...some time before 2002!
      constructor(p2) {
        p2.uint16;
        p2.uint16;
        this.signatureLength = p2.uint32;
        this.signature = p2.readBytes(this.signatureLength);
      }
    };
  }
});

// src/opentype/tables/simple/other/hdmx.js
var hdmx_exports = {};
__export(hdmx_exports, {
  hdmx: () => hdmx
});
var hdmx, DeviceRecord;
var init_hdmx = __esm({
  "src/opentype/tables/simple/other/hdmx.js"() {
    init_simple_table();
    hdmx = class extends SimpleTable {
      constructor(dict, dataview, tables) {
        const { p: p2 } = super(dict, dataview);
        const numGlyphs = tables.hmtx.numGlyphs;
        this.version = p2.uint16;
        this.numRecords = p2.int16;
        this.sizeDeviceRecord = p2.int32;
        this.records = [...new Array(numRecords)].map(
          (_) => new DeviceRecord(p2, numGlyphs)
        );
      }
    };
    DeviceRecord = class {
      constructor(p2, numGlyphs) {
        this.pixelSize = p2.uint8;
        this.maxWidth = p2.uint8;
        this.widths = p2.readBytes(numGlyphs);
      }
    };
  }
});

// src/opentype/tables/simple/other/kern.js
var kern_exports = {};
__export(kern_exports, {
  kern: () => kern
});
var kern, KernSubTable, Pair;
var init_kern = __esm({
  "src/opentype/tables/simple/other/kern.js"() {
    init_simple_table();
    init_lazy();
    kern = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.version = p2.uint16;
        this.nTables = p2.uint16;
        lazy(this, `tables`, () => {
          let offset = this.tableStart + 4;
          const tables = [];
          for (let i = 0; i < this.nTables; i++) {
            p2.currentPosition = offset;
            let subtable = new KernSubTable(p2);
            tables.push(subtable);
            offset += subtable;
          }
          return tables;
        });
      }
    };
    KernSubTable = class {
      constructor(p2) {
        this.version = p2.uint16;
        this.length = p2.uint16;
        this.coverage = p2.flags(8);
        this.format = p2.uint8;
        if (this.format === 0) {
          this.nPairs = p2.uint16;
          this.searchRange = p2.uint16;
          this.entrySelector = p2.uint16;
          this.rangeShift = p2.uint16;
          lazy(
            this,
            `pairs`,
            () => [...new Array(this.nPairs)].map((_) => new Pair(p2))
          );
        }
        if (this.format === 2) {
          console.warn(
            `Kern subtable format 2 is not supported: this parser currently only parses universal table data.`
          );
        }
      }
      get horizontal() {
        return this.coverage[0];
      }
      get minimum() {
        return this.coverage[1];
      }
      get crossstream() {
        return this.coverage[2];
      }
      get override() {
        return this.coverage[3];
      }
    };
    Pair = class {
      constructor(p2) {
        this.left = p2.uint16;
        this.right = p2.uint16;
        this.value = p2.fword;
      }
    };
  }
});

// src/opentype/tables/simple/other/LTSH.js
var LTSH_exports = {};
__export(LTSH_exports, {
  LTSH: () => LTSH
});
var LTSH;
var init_LTSH = __esm({
  "src/opentype/tables/simple/other/LTSH.js"() {
    init_simple_table();
    LTSH = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.version = p2.uint16;
        this.numGlyphs = p2.uint16;
        this.yPels = p2.readBytes(this.numGlyphs);
      }
    };
  }
});

// src/opentype/tables/simple/other/MERG.js
var MERG_exports = {};
__export(MERG_exports, {
  MERG: () => MERG
});
var MERG;
var init_MERG = __esm({
  "src/opentype/tables/simple/other/MERG.js"() {
    init_simple_table();
    init_lazy();
    MERG = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.version = p2.uint16;
        this.mergeClassCount = p2.uint16;
        this.mergeDataOffset = p2.Offset16;
        this.classDefCount = p2.uint16;
        this.offsetToClassDefOffsets = p2.Offset16;
        lazy(
          this,
          `mergeEntryMatrix`,
          () => [...new Array(this.mergeClassCount)].map(
            (_) => p2.readBytes(this.mergeClassCount)
          )
        );
        console.warn(`Full MERG parsing is currently not supported.`);
        console.warn(
          `If you need this table parsed, please file an issue, or better yet, a PR.`
        );
      }
    };
  }
});

// src/opentype/tables/simple/other/meta.js
var meta_exports = {};
__export(meta_exports, {
  meta: () => meta
});
var meta, DataMap;
var init_meta = __esm({
  "src/opentype/tables/simple/other/meta.js"() {
    init_simple_table();
    meta = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.version = p2.uint32;
        this.flags = p2.uint32;
        p2.uint32;
        this.dataMapsCount = p2.uint32;
        this.dataMaps = [...new Array(this.dataMapsCount)].map(
          (_) => new DataMap(this.tableStart, p2)
        );
      }
    };
    DataMap = class {
      constructor(tableStart, p2) {
        this.tableStart = tableStart;
        this.parser = p2;
        this.tag = p2.tag;
        this.dataOffset = p2.Offset32;
        this.dataLength = p2.uint32;
      }
      getData() {
        this.parser.currentField = this.tableStart + this.dataOffset;
        return this.parser.readBytes(this.dataLength);
      }
    };
  }
});

// src/opentype/tables/simple/other/PCLT.js
var PCLT_exports = {};
__export(PCLT_exports, {
  PCLT: () => PCLT
});
var PCLT;
var init_PCLT = __esm({
  "src/opentype/tables/simple/other/PCLT.js"() {
    init_simple_table();
    PCLT = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        console.warn(
          `This font uses a PCLT table, which is currently not supported by this parser.`
        );
        console.warn(
          `If you need this table parsed, please file an issue, or better yet, a PR.`
        );
      }
    };
  }
});

// src/opentype/tables/simple/other/VDMX.js
var VDMX_exports = {};
__export(VDMX_exports, {
  VDMX: () => VDMX
});
var VDMX, RatioRange, VDMXGroup, vTable;
var init_VDMX = __esm({
  "src/opentype/tables/simple/other/VDMX.js"() {
    init_simple_table();
    VDMX = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.version = p2.uint16;
        this.numRecs = p2.uint16;
        this.numRatios = p2.uint16;
        this.ratRanges = [...new Array(this.numRatios)].map(
          (_) => new RatioRange(p2)
        );
        this.offsets = [...new Array(this.numRatios)].map((_) => p2.Offset16);
        this.VDMXGroups = [...new Array(this.numRecs)].map((_) => new VDMXGroup(p2));
      }
    };
    RatioRange = class {
      constructor(p2) {
        this.bCharSet = p2.uint8;
        this.xRatio = p2.uint8;
        this.yStartRatio = p2.uint8;
        this.yEndRatio = p2.uint8;
      }
    };
    VDMXGroup = class {
      constructor(p2) {
        this.recs = p2.uint16;
        this.startsz = p2.uint8;
        this.endsz = p2.uint8;
        this.records = [...new Array(this.recs)].map((_) => new vTable(p2));
      }
    };
    vTable = class {
      constructor(p2) {
        this.yPelHeight = p2.uint16;
        this.yMax = p2.int16;
        this.yMin = p2.int16;
      }
    };
  }
});

// src/opentype/tables/simple/other/vhea.js
var vhea_exports = {};
__export(vhea_exports, {
  vhea: () => vhea
});
var vhea;
var init_vhea = __esm({
  "src/opentype/tables/simple/other/vhea.js"() {
    init_simple_table();
    vhea = class extends SimpleTable {
      constructor(dict, dataview) {
        const { p: p2 } = super(dict, dataview);
        this.version = p2.fixed;
        this.ascent = this.vertTypoAscender = p2.int16;
        this.descent = this.vertTypoDescender = p2.int16;
        this.lineGap = this.vertTypoLineGap = p2.int16;
        this.advanceHeightMax = p2.int16;
        this.minTopSideBearing = p2.int16;
        this.minBottomSideBearing = p2.int16;
        this.yMaxExtent = p2.int16;
        this.caretSlopeRise = p2.int16;
        this.caretSlopeRun = p2.int16;
        this.caretOffset = p2.int16;
        this.reserved = p2.int16;
        this.reserved = p2.int16;
        this.reserved = p2.int16;
        this.reserved = p2.int16;
        this.metricDataFormat = p2.int16;
        this.numOfLongVerMetrics = p2.uint16;
        p2.verifyLength();
      }
    };
  }
});

// src/opentype/tables/simple/other/vmtx.js
var vmtx_exports = {};
__export(vmtx_exports, {
  vmtx: () => vmtx
});
var vmtx, LongVerMetric;
var init_vmtx = __esm({
  "src/opentype/tables/simple/other/vmtx.js"() {
    init_simple_table();
    init_lazy();
    vmtx = class extends SimpleTable {
      constructor(dict, dataview, tables) {
        const { p: p2 } = super(dict, dataview);
        const numOfLongVerMetrics = tables.vhea.numOfLongVerMetrics;
        const numGlyphs = tables.maxp.numGlyphs;
        const metricsStart = p2.currentPosition;
        lazy(this, `vMetrics`, () => {
          p2.currentPosition = metricsStart;
          return [...new Array(numOfLongVerMetrics)].map(
            (_) => new LongVerMetric(p2.uint16, p2.int16)
          );
        });
        if (numOfLongVerMetrics < numGlyphs) {
          const tsbStart = metricsStart + numOfLongVerMetrics * 4;
          lazy(this, `topSideBearings`, () => {
            p2.currentPosition = tsbStart;
            return [...new Array(numGlyphs - numOfLongVerMetrics)].map(
              (_) => p2.int16
            );
          });
        }
      }
    };
    LongVerMetric = class {
      // https://learn.microsoft.com/en-us/typography/opentype/spec/vmtx#vertical-metrics-table-format
      constructor(h, b) {
        this.advanceHeight = h;
        this.topSideBearing = b;
      }
    };
  }
});

// lib-font.mjs
var lib_font_exports = {};
__export(lib_font_exports, {
  Font: () => Font
});
module.exports = __toCommonJS(lib_font_exports);

// src/utils/shim-fetch.js
var fetchFunction = globalThis.fetch;
if (!fetchFunction) {
  let backlog = [];
  fetchFunction = globalThis.fetch = (...args) => {
    return new Promise((resolve, reject) => {
      backlog.push({ args, resolve, reject });
    });
  };
  import("fs").then((fs) => {
    fetchFunction = globalThis.fetch = async function(path) {
      return new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
          if (err)
            return reject(err);
          resolve({
            ok: true,
            arrayBuffer: () => data.buffer
          });
        });
      });
    };
    while (backlog.length) {
      let instruction = backlog.shift();
      fetchFunction(...instruction.args).then((data) => instruction.resolve(data)).catch((err) => instruction.reject(err));
    }
  }).catch((err) => {
    console.error(err);
    throw new Error(
      `lib-font cannot run unless either the Fetch API or Node's filesystem module is available.`
    );
  });
}

// src/eventing.js
var Event = class {
  constructor(type, detail = {}, msg) {
    this.type = type;
    this.detail = detail;
    this.msg = msg;
    Object.defineProperty(this, `__mayPropagate`, {
      enumerable: false,
      writable: true
    });
    this.__mayPropagate = true;
  }
  preventDefault() {
  }
  stopPropagation() {
    this.__mayPropagate = false;
  }
  valueOf() {
    return this;
  }
  toString() {
    return this.msg ? `[${this.type} event]: ${this.msg}` : `[${this.type} event]`;
  }
};
var EventManager = class {
  constructor() {
    this.listeners = {};
  }
  addEventListener(type, listener, useCapture) {
    let bin = this.listeners[type] || [];
    if (useCapture)
      bin.unshift(listener);
    else
      bin.push(listener);
    this.listeners[type] = bin;
  }
  removeEventListener(type, listener) {
    let bin = this.listeners[type] || [];
    let pos = bin.findIndex((e) => e === listener);
    if (pos > -1) {
      bin.splice(pos, 1);
      this.listeners[type] = bin;
    }
  }
  dispatch(event) {
    let bin = this.listeners[event.type];
    if (bin) {
      for (let l = 0, e = bin.length; l < e; l++) {
        if (!event.__mayPropagate)
          break;
        bin[l](event);
      }
    }
  }
};

// src/opentype/sfnt.js
init_simple_table();
init_lazy();
var SFNT = class extends SimpleTable {
  constructor(font2, dataview, createTable2) {
    const { p: p2 } = super({ offset: 0, length: 12 }, dataview, `sfnt`);
    this.version = p2.uint32;
    this.numTables = p2.uint16;
    this.searchRange = p2.uint16;
    this.entrySelector = p2.uint16;
    this.rangeShift = p2.uint16;
    p2.verifyLength();
    this.directory = [...new Array(this.numTables)].map(
      (_) => new TableRecord(p2)
    );
    this.tables = {};
    this.directory.forEach((entry) => {
      const getter = () => {
        return createTable2(
          this.tables,
          {
            tag: entry.tag,
            offset: entry.offset,
            length: entry.length
          },
          dataview
        );
      };
      lazy(this.tables, entry.tag.trim(), getter);
    });
  }
};
var TableRecord = class {
  constructor(p2) {
    this.tag = p2.tag;
    this.checksum = p2.uint32;
    this.offset = p2.uint32;
    this.length = p2.uint32;
  }
};

// src/opentype/woff.js
init_simple_table();
init_lazy();
var gzipDecode = globalThis.pako ? globalThis.pako.inflate : void 0;
var nativeGzipDecode = void 0;
if (!gzipDecode) {
  import("zlib").then((zlib) => {
    nativeGzipDecode = (buffer) => zlib.unzipSync(buffer);
  });
}
var WOFF = class extends SimpleTable {
  constructor(font2, dataview, createTable2) {
    const { p: p2 } = super({ offset: 0, length: 44 }, dataview, `woff`);
    this.signature = p2.tag;
    this.flavor = p2.uint32;
    this.length = p2.uint32;
    this.numTables = p2.uint16;
    p2.uint16;
    this.totalSfntSize = p2.uint32;
    this.majorVersion = p2.uint16;
    this.minorVersion = p2.uint16;
    this.metaOffset = p2.uint32;
    this.metaLength = p2.uint32;
    this.metaOrigLength = p2.uint32;
    this.privOffset = p2.uint32;
    this.privLength = p2.uint32;
    p2.verifyLength();
    this.directory = [...new Array(this.numTables)].map(
      (_) => new WoffTableDirectoryEntry(p2)
    );
    buildWoffLazyLookups(this, dataview, createTable2);
  }
};
var WoffTableDirectoryEntry = class {
  constructor(p2) {
    this.tag = p2.tag;
    this.offset = p2.uint32;
    this.compLength = p2.uint32;
    this.origLength = p2.uint32;
    this.origChecksum = p2.uint32;
  }
};
function buildWoffLazyLookups(woff, dataview, createTable2) {
  woff.tables = {};
  woff.directory.forEach((entry) => {
    lazy(woff.tables, entry.tag.trim(), () => {
      let offset = 0;
      let view = dataview;
      if (entry.compLength !== entry.origLength) {
        const data = dataview.buffer.slice(
          entry.offset,
          entry.offset + entry.compLength
        );
        let unpacked;
        if (gzipDecode) {
          unpacked = gzipDecode(new Uint8Array(data));
        } else if (nativeGzipDecode) {
          unpacked = nativeGzipDecode(new Uint8Array(data));
        } else {
          const msg = `no brotli decoder available to decode WOFF2 font`;
          if (font.onerror)
            font.onerror(msg);
          throw new Error(msg);
        }
        view = new DataView(unpacked.buffer);
      } else {
        offset = entry.offset;
      }
      return createTable2(
        woff.tables,
        { tag: entry.tag, offset, length: entry.origLength },
        view
      );
    });
  });
}

// src/opentype/woff2.js
init_simple_table();
init_lazy();
var brotliDecode = globalThis.unbrotli;
var nativeBrotliDecode = void 0;
if (!brotliDecode) {
  import("zlib").then((zlib) => {
    nativeBrotliDecode = (buffer) => zlib.brotliDecompressSync(buffer);
  });
}
var WOFF2 = class extends SimpleTable {
  constructor(font2, dataview, createTable2) {
    const { p: p2 } = super({ offset: 0, length: 48 }, dataview, `woff2`);
    this.signature = p2.tag;
    this.flavor = p2.uint32;
    this.length = p2.uint32;
    this.numTables = p2.uint16;
    p2.uint16;
    this.totalSfntSize = p2.uint32;
    this.totalCompressedSize = p2.uint32;
    this.majorVersion = p2.uint16;
    this.minorVersion = p2.uint16;
    this.metaOffset = p2.uint32;
    this.metaLength = p2.uint32;
    this.metaOrigLength = p2.uint32;
    this.privOffset = p2.uint32;
    this.privLength = p2.uint32;
    p2.verifyLength();
    this.directory = [...new Array(this.numTables)].map(
      (_) => new Woff2TableDirectoryEntry(p2)
    );
    let dictOffset = p2.currentPosition;
    this.directory[0].offset = 0;
    this.directory.forEach((e, i) => {
      let next = this.directory[i + 1];
      if (next) {
        next.offset = e.offset + (e.transformLength !== void 0 ? e.transformLength : e.origLength);
      }
    });
    let decoded;
    let buffer = dataview.buffer.slice(dictOffset);
    if (brotliDecode) {
      decoded = brotliDecode(new Uint8Array(buffer));
    } else if (nativeBrotliDecode) {
      decoded = new Uint8Array(nativeBrotliDecode(buffer));
    } else {
      const msg = `no brotli decoder available to decode WOFF2 font`;
      if (font2.onerror)
        font2.onerror(msg);
      throw new Error(msg);
    }
    buildWoff2LazyLookups(this, decoded, createTable2);
  }
};
var Woff2TableDirectoryEntry = class {
  constructor(p2) {
    this.flags = p2.uint8;
    const tagNumber = this.tagNumber = this.flags & 63;
    if (tagNumber === 63) {
      this.tag = p2.tag;
    } else {
      this.tag = getWOFF2Tag(tagNumber);
    }
    const transformVersion = this.transformVersion = (this.flags & 192) >> 6;
    let hasTransforms = transformVersion !== 0;
    if (this.tag === `glyf` || this.tag === `loca`) {
      hasTransforms = this.transformVersion !== 3;
    }
    this.origLength = p2.uint128;
    if (hasTransforms) {
      this.transformLength = p2.uint128;
    }
  }
};
function buildWoff2LazyLookups(woff2, decoded, createTable2) {
  woff2.tables = {};
  woff2.directory.forEach((entry) => {
    lazy(woff2.tables, entry.tag.trim(), () => {
      const start = entry.offset;
      const end = start + (entry.transformLength ? entry.transformLength : entry.origLength);
      const data = new DataView(decoded.slice(start, end).buffer);
      try {
        return createTable2(
          woff2.tables,
          { tag: entry.tag, offset: 0, length: entry.origLength },
          data
        );
      } catch (e) {
        console.error(e);
      }
    });
  });
}
function getWOFF2Tag(flag) {
  return [
    `cmap`,
    `head`,
    `hhea`,
    `hmtx`,
    `maxp`,
    `name`,
    `OS/2`,
    `post`,
    `cvt `,
    `fpgm`,
    `glyf`,
    `loca`,
    `prep`,
    `CFF `,
    `VORG`,
    `EBDT`,
    `EBLC`,
    `gasp`,
    `hdmx`,
    `kern`,
    `LTSH`,
    `PCLT`,
    `VDMX`,
    `vhea`,
    `vmtx`,
    `BASE`,
    `GDEF`,
    `GPOS`,
    `GSUB`,
    `EBSC`,
    `JSTF`,
    `MATH`,
    `CBDT`,
    `CBLC`,
    `COLR`,
    `CPAL`,
    `SVG `,
    `sbix`,
    `acnt`,
    `avar`,
    `bdat`,
    `bloc`,
    `bsln`,
    `cvar`,
    `fdsc`,
    `feat`,
    `fmtx`,
    `fvar`,
    `gvar`,
    `hsty`,
    `just`,
    `lcar`,
    `mort`,
    `morx`,
    `opbd`,
    `prop`,
    `trak`,
    `Zapf`,
    `Silf`,
    `Glat`,
    `Gloc`,
    `Feat`,
    `Sill`
  ][flag & 63];
}

// src/opentype/tables/createTable.js
var tableClasses = {};
var tableClassesLoaded = false;
Promise.all([
  // opentype tables
  Promise.resolve().then(() => (init_cmap(), cmap_exports)),
  Promise.resolve().then(() => (init_head(), head_exports)),
  Promise.resolve().then(() => (init_hhea(), hhea_exports)),
  Promise.resolve().then(() => (init_hmtx(), hmtx_exports)),
  Promise.resolve().then(() => (init_maxp(), maxp_exports)),
  Promise.resolve().then(() => (init_name(), name_exports)),
  Promise.resolve().then(() => (init_OS2(), OS2_exports)),
  Promise.resolve().then(() => (init_post(), post_exports)),
  // opentype tables that rely on the "common layout tables" data structures
  Promise.resolve().then(() => (init_BASE(), BASE_exports)),
  Promise.resolve().then(() => (init_GDEF(), GDEF_exports)),
  Promise.resolve().then(() => (init_GSUB(), GSUB_exports)),
  Promise.resolve().then(() => (init_GPOS(), GPOS_exports)),
  // SVG tables... err... table
  Promise.resolve().then(() => (init_SVG(), SVG_exports)),
  // Variable fonts
  Promise.resolve().then(() => (init_fvar(), fvar_exports)),
  // TTF tables
  Promise.resolve().then(() => (init_cvt(), cvt_exports)),
  Promise.resolve().then(() => (init_fpgm(), fpgm_exports)),
  Promise.resolve().then(() => (init_gasp(), gasp_exports)),
  Promise.resolve().then(() => (init_glyf(), glyf_exports)),
  Promise.resolve().then(() => (init_loca(), loca_exports)),
  Promise.resolve().then(() => (init_prep(), prep_exports)),
  // CFF
  Promise.resolve().then(() => (init_CFF(), CFF_exports)),
  Promise.resolve().then(() => (init_CFF2(), CFF2_exports)),
  Promise.resolve().then(() => (init_VORG(), VORG_exports)),
  // bitmap
  Promise.resolve().then(() => (init_EBLC(), EBLC_exports)),
  Promise.resolve().then(() => (init_EBDT(), EBDT_exports)),
  Promise.resolve().then(() => (init_EBSC(), EBSC_exports)),
  Promise.resolve().then(() => (init_CBLC(), CBLC_exports)),
  Promise.resolve().then(() => (init_CBDT(), CBDT_exports)),
  Promise.resolve().then(() => (init_sbix(), sbix_exports)),
  // color
  Promise.resolve().then(() => (init_COLR(), COLR_exports)),
  Promise.resolve().then(() => (init_CPAL(), CPAL_exports)),
  // "other" tables
  Promise.resolve().then(() => (init_DSIG(), DSIG_exports)),
  Promise.resolve().then(() => (init_hdmx(), hdmx_exports)),
  Promise.resolve().then(() => (init_kern(), kern_exports)),
  Promise.resolve().then(() => (init_LTSH(), LTSH_exports)),
  Promise.resolve().then(() => (init_MERG(), MERG_exports)),
  Promise.resolve().then(() => (init_meta(), meta_exports)),
  Promise.resolve().then(() => (init_PCLT(), PCLT_exports)),
  Promise.resolve().then(() => (init_VDMX(), VDMX_exports)),
  Promise.resolve().then(() => (init_vhea(), vhea_exports)),
  Promise.resolve().then(() => (init_vmtx(), vmtx_exports))
]).then((data) => {
  data.forEach((e) => {
    let name2 = Object.keys(e)[0];
    tableClasses[name2] = e[name2];
  });
  tableClassesLoaded = true;
});
function createTable(tables, dict, dataview) {
  let name2 = dict.tag.replace(/[^\w\d]/g, ``);
  let Type = tableClasses[name2];
  if (Type)
    return new Type(dict, dataview, tables);
  console.warn(
    `lib-font has no definition for ${name2}. The table was skipped.`
  );
  return {};
}
function loadTableClasses() {
  let count = 0;
  function checkLoaded(resolve, reject) {
    if (!tableClassesLoaded) {
      if (count > 10) {
        return reject(new Error(`loading took too long`));
      }
      count++;
      return setTimeout(() => checkLoaded(resolve), 250);
    }
    resolve(createTable);
  }
  return new Promise((resolve, reject) => checkLoaded(resolve));
}

// src/utils/fontface.js
function getFontCSSFormat(path, errorOnStyle) {
  let pos = path.lastIndexOf(`.`);
  let ext = (path.substring(pos + 1) || ``).toLowerCase();
  let format = {
    ttf: `truetype`,
    otf: `opentype`,
    woff: `woff`,
    woff2: `woff2`
  }[ext];
  if (format)
    return format;
  let msg = {
    eot: `The .eot format is not supported: it died in January 12, 2016, when Microsoft retired all versions of IE that didn't already support WOFF.`,
    svg: `The .svg format is not supported: SVG fonts (not to be confused with OpenType with embedded SVG) were so bad we took the entire fonts chapter out of the SVG specification again.`,
    fon: `The .fon format is not supported: this is an ancient Windows bitmap font format.`,
    ttc: `Based on the current CSS specification, font collections are not (yet?) supported.`
  }[ext];
  if (!msg)
    msg = `${path} is not a known webfont format.`;
  if (errorOnStyle) {
    throw new Error(msg);
  } else {
    console.warn(`Could not load font: ${msg}`);
  }
}
async function setupFontFace(name2, url, options = {}) {
  if (!globalThis.document)
    return;
  let format = getFontCSSFormat(url, options.errorOnStyle);
  if (!format)
    return;
  let style = document.createElement(`style`);
  style.className = `injected-by-Font-js`;
  let rules = [];
  if (options.styleRules) {
    rules = Object.entries(options.styleRules).map(
      ([key, value]) => `${key}: ${value};`
    );
  }
  style.textContent = `
@font-face {
    font-family: "${name2}";
    ${rules.join(`
	`)}
    src: url("${url}") format("${format}");
}`;
  globalThis.document.head.appendChild(style);
  return style;
}

// src/utils/validator.js
var TTF = [0, 1, 0, 0];
var OTF = [79, 84, 84, 79];
var WOFF3 = [119, 79, 70, 70];
var WOFF22 = [119, 79, 70, 50];
function match(ar1, ar2) {
  if (ar1.length !== ar2.length)
    return;
  for (let i = 0; i < ar1.length; i++) {
    if (ar1[i] !== ar2[i])
      return;
  }
  return true;
}
function validFontFormat(dataview) {
  const LEAD_BYTES = [
    dataview.getUint8(0),
    dataview.getUint8(1),
    dataview.getUint8(2),
    dataview.getUint8(3)
  ];
  if (match(LEAD_BYTES, TTF) || match(LEAD_BYTES, OTF))
    return `SFNT`;
  if (match(LEAD_BYTES, WOFF3))
    return `WOFF`;
  if (match(LEAD_BYTES, WOFF22))
    return `WOFF2`;
}

// lib-font.mjs
function checkFetchResponseStatus(response) {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} - ${response.statusText}`);
  }
  return response;
}
var Font = class extends EventManager {
  constructor(name2, options = {}) {
    super();
    this.name = name2;
    this.options = options;
    this.metrics = false;
  }
  get src() {
    return this.__src;
  }
  /**
   * Just like Image and Audio, we kick everything off when
   * our `src` gets assigned.
   *
   * @param {string} source url for this font ("real" or blob/base64)
   */
  set src(src) {
    this.__src = src;
    (async () => {
      if (globalThis.document && !this.options.skipStyleSheet) {
        await setupFontFace(this.name, src, this.options);
      }
      this.loadFont(src);
    })();
  }
  /**
   * This is a non-blocking operation.
   *
   * @param {String} url The URL for the font in question
   * @param {String} filename The filename to use when URL is a blob/base64 string
   */
  async loadFont(url, filename) {
    fetch(url).then((response) => checkFetchResponseStatus(response) && response.arrayBuffer()).then((buffer) => this.fromDataBuffer(buffer, filename || url)).catch((err) => {
      const evt = new Event(`error`, err, `Failed to load font at ${filename || url}`);
      this.dispatch(evt);
      if (this.onerror)
        this.onerror(evt);
    });
  }
  /**
   * This is a non-blocking operation.
   *
   * @param {Buffer} buffer The binary data associated with this font.
   */
  async fromDataBuffer(buffer, filenameOrUrL) {
    this.fontData = new DataView(buffer);
    let type = validFontFormat(this.fontData);
    if (!type) {
      throw new Error(`${filenameOrUrL} is either an unsupported font format, or not a font at all.`);
    }
    await this.parseBasicData(type);
    const evt = new Event("load", { font: this });
    this.dispatch(evt);
    if (this.onload)
      this.onload(evt);
  }
  /**
   * This is a non-blocking operation IF called from an async function
   */
  async parseBasicData(type) {
    return loadTableClasses().then((createTable2) => {
      if (type === `SFNT`) {
        this.opentype = new SFNT(this, this.fontData, createTable2);
      }
      if (type === `WOFF`) {
        this.opentype = new WOFF(this, this.fontData, createTable2);
      }
      if (type === `WOFF2`) {
        this.opentype = new WOFF2(this, this.fontData, createTable2);
      }
      return this.opentype;
    });
  }
  /**
   * Does this font support the specified character?
   * @param {*} char
   */
  getGlyphId(char) {
    return this.opentype.tables.cmap.getGlyphId(char);
  }
  /**
   * find the actual "letter" for a given glyphid
   * @param {*} glyphid
   */
  reverse(glyphid) {
    return this.opentype.tables.cmap.reverse(glyphid);
  }
  /**
   * Does this font support the specified character?
   * @param {*} char
   */
  supports(char) {
    return this.getGlyphId(char) !== 0;
  }
  /**
   * Does this font support the specified unicode variation?
   * @param {*} variation
   */
  supportsVariation(variation) {
    return this.opentype.tables.cmap.supportsVariation(variation) !== false;
  }
  /**
   * Effectively, be https://html.spec.whatwg.org/multipage/canvas.html#textmetrics
   * @param {*} text
   * @param {*} size
   */
  measureText(text, size = 16) {
    if (this.__unloaded)
      throw new Error("Cannot measure text: font was unloaded. Please reload before calling measureText()");
    let d = document.createElement("div");
    d.textContent = text;
    d.style.fontFamily = this.name;
    d.style.fontSize = `${size}px`;
    d.style.color = `transparent`;
    d.style.background = `transparent`;
    d.style.top = `0`;
    d.style.left = `0`;
    d.style.position = `absolute`;
    document.body.appendChild(d);
    let bbox = d.getBoundingClientRect();
    document.body.removeChild(d);
    const OS22 = this.opentype.tables["OS/2"];
    bbox.fontSize = size;
    bbox.ascender = OS22.sTypoAscender;
    bbox.descender = OS22.sTypoDescender;
    return bbox;
  }
  /**
   * unload this font from the DOM context, making it no longer available for CSS purposes
   */
  unload() {
    if (this.styleElement.parentNode) {
      this.styleElement.parentNode.removeElement(this.styleElement);
      const evt = new Event("unload", { font: this });
      this.dispatch(evt);
      if (this.onunload)
        this.onunload(evt);
    }
    this._unloaded = true;
  }
  /**
   * load this font back into the DOM context after being unload()'d earlier.
   */
  load() {
    if (this.__unloaded) {
      delete this.__unloaded;
      document.head.appendChild(this.styleElement);
      const evt = new Event("load", { font: this });
      this.dispatch(evt);
      if (this.onload)
        this.onload(evt);
    }
  }
};
globalThis.Font = Font;
