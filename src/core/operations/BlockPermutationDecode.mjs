/**
 * @author OpenAI
 * @copyright Crown Copyright 2026
 * @license Apache-2.0
 */

import Operation from "../Operation.mjs";
import OperationError from "../errors/OperationError.mjs";

const WILDCARD = "*";
const MAX_RESULTS = 10000;

/**
 * Block Permutation Decode operation
 */
class BlockPermutationDecode extends Operation {

    /**
     * BlockPermutationDecode constructor
     */
    constructor() {
        super();

        this.name = "Block Permutation Decode";
        this.module = "Ciphers";
        this.description = "Decodes text by splitting it into fixed-length blocks and reordering each block using a permutation mask. Leave the mask blank to use 0,1,...,n-1. Use ',' or spaces between mask values. Use '*' for unknown positions; missing mask positions are padded with '*'.";
        this.infoURL = "https://wikipedia.org/wiki/Transposition_cipher";
        this.inputType = "string";
        this.outputType = "string";
        this.args = [
            {
                name: "Block length",
                type: "number",
                value: 6,
                min: 1,
                max: 50,
                hint: "Number of characters in each block."
            },
            {
                name: "Permutation mask",
                type: "string",
                value: "",
                hint: "Comma- or space-separated zero-based indexes. Blank means auto. Use '*' for unknown positions, e.g. *,4,2,3,*,* or * 4 2 3 * *."
            }
        ];
    }

    /**
     * @param {string} input
     * @param {Object[]} args
     * @returns {string}
     */
    run(input, args) {
        const [blockLength, maskStr] = args,
            mask = parseMask(maskStr, blockLength),
            stats = getStats(mask);

        validateLimits(blockLength);

        if (stats.wildcardCount === 0) {
            return decode(input, mask, blockLength);
        }

        if (stats.candidates > MAX_RESULTS) {
            throw new OperationError(`Too many candidate permutations: ${stats.candidates}. The limit is ${MAX_RESULTS}; fix more mask positions or reduce the block length.`);
        }

        if (isWorkerEnvironment())
            self.sendStatusMessage(`Calculating ${stats.candidates} block permutations...`);

        const output = [
            `# block length: ${blockLength}`,
            `# resolved mask: ${maskToString(mask)}`,
            `# wildcard positions: ${stats.wildcardCount}`,
            `# candidate permutations: ${stats.candidates}`
        ];
        let count = 0;

        for (const perm of generateMasks(mask, blockLength)) {
            count++;
            if (count % 10000 === 0 && isWorkerEnvironment()) {
                self.sendStatusMessage(`Calculating ${stats.candidates} block permutations... ${Math.floor(count / stats.candidates * 100)}%`);
            }

            const decoded = decode(input, perm, blockLength);

            output.push(`\n# perm: ${maskToString(perm)}\n${decoded}`);
        }

        return output.join("\n");
    }

}

/**
 * @param {string} maskStr
 * @param {number} blockLength
 * @returns {Array<number|string>}
 */
function parseMask(maskStr, blockLength) {
    if (!Number.isInteger(blockLength) || blockLength < 1) {
        throw new OperationError("Block length must be a positive integer.");
    }

    const rawMask = maskStr.trim();
    const parts = rawMask ?
        rawMask.split(/[,\s]+/) :
        defaultMask(blockLength).split(",");

    if (parts.length > blockLength) {
        throw new OperationError(`Permutation mask length (${parts.length}) must not exceed block length (${blockLength}).`);
    }

    while (parts.length < blockLength) parts.push(WILDCARD);

    const seen = new Set();
    return parts.map(part => {
        if (part === WILDCARD) return WILDCARD;

        if (!/^\d+$/.test(part)) {
            throw new OperationError("Permutation mask values must be zero-based indexes or '*'.");
        }

        const value = parseInt(part, 10);
        if (value < 0 || value >= blockLength) {
            throw new OperationError(`Permutation index ${value} is outside the block range 0-${blockLength - 1}.`);
        }
        if (seen.has(value)) {
            throw new OperationError(`Permutation index ${value} is repeated.`);
        }

        seen.add(value);
        return value;
    });
}

/**
 * @param {number} blockLength
 * @returns {string}
 */
function defaultMask(blockLength) {
    return Array.from({length: blockLength}, (_, i) => i).join(",");
}

/**
 * @param {Array<number|string>} mask
 * @returns {{wildcardCount: number, candidates: number}}
 */
function getStats(mask) {
    const wildcardCount = mask.filter(value => value === WILDCARD).length;
    return {
        wildcardCount,
        candidates: factorial(wildcardCount)
    };
}

/**
 * @param {number} n
 * @returns {number}
 */
function factorial(n) {
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
}

/**
 * @param {Array<number|string>} mask
 * @param {number} blockLength
 * @returns {Generator<Array<number>>}
 */
function* generateMasks(mask, blockLength) {
    const fixed = mask.filter(value => value !== WILDCARD),
        emptyPositions = mask
            .map((value, i) => value === WILDCARD ? i : -1)
            .filter(value => value >= 0),
        remaining = [];

    for (let i = 0; i < blockLength; i++) {
        if (fixed.indexOf(i) < 0) remaining.push(i);
    }

    for (const values of permutations(remaining)) {
        const perm = mask.slice();
        emptyPositions.forEach((pos, i) => {
            perm[pos] = values[i];
        });
        yield perm;
    }
}

/**
 * @param {number[]} values
 * @returns {Generator<number[]>}
 */
function* permutations(values) {
    if (values.length === 0) {
        yield [];
        return;
    }

    for (let i = 0; i < values.length; i++) {
        const head = values[i],
            tail = values.slice(0, i).concat(values.slice(i + 1));

        for (const rest of permutations(tail)) {
            yield [head].concat(rest);
        }
    }
}

/**
 * @param {string} input
 * @param {Array<number|string>} perm
 * @param {number} blockLength
 * @returns {string}
 */
function decode(input, perm, blockLength) {
    let output = "";

    for (let i = 0; i < input.length; i += blockLength) {
        const block = input.slice(i, i + blockLength);

        for (const index of perm) {
            if (index < block.length) output += block[index];
        }
    }

    return output;
}

/**
 * @param {Array<number|string>} mask
 * @returns {string}
 */
function maskToString(mask) {
    return mask.join(",");
}

/**
 * @param {number} blockLength
 */
function validateLimits(blockLength) {
    if (blockLength > 50) {
        throw new OperationError("Block length must be 50 or less.");
    }
}

/**
 * @returns {boolean}
 */
function isWorkerEnvironment() {
    return typeof self !== "undefined" && typeof self.sendStatusMessage === "function";
}

export default BlockPermutationDecode;
