/**
 * @author OpenAI
 * @copyright Crown Copyright 2026
 * @license Apache-2.0
 */

import Operation from "../Operation.mjs";
import OperationError from "../errors/OperationError.mjs";

const WILDCARD = "*";

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
        this.description = "Decodes text by splitting it into fixed-length blocks and reordering each block using a permutation mask. Use '*' in the mask to enumerate unknown positions.";
        this.infoURL = "https://wikipedia.org/wiki/Transposition_cipher";
        this.inputType = "string";
        this.outputType = "string";
        this.args = [
            {
                name: "Block length",
                type: "number",
                value: 6
            },
            {
                name: "Permutation mask",
                type: "string",
                value: ""
            },
            {
                name: "Mode",
                type: "option",
                value: ["Apply single permutation", "Enumerate wildcard permutations"]
            },
            {
                name: "Crib filter",
                type: "string",
                value: ""
            },
            {
                name: "Max results",
                type: "number",
                value: 10000
            },
            {
                name: "Show stats only",
                type: "boolean",
                value: false
            }
        ];
    }

    /**
     * @param {string} input
     * @param {Object[]} args
     * @returns {string}
     */
    run(input, args) {
        const [blockLength, maskStr, mode, crib, maxResults, showStatsOnly] = args,
            mask = parseMask(maskStr, blockLength),
            stats = getStats(mask);

        validateLimits(blockLength, maxResults);

        if (mode === "Apply single permutation" && stats.wildcardCount > 0) {
            throw new OperationError("The permutation mask contains wildcards. Use 'Enumerate wildcard permutations' mode or provide a complete permutation.");
        }

        const statsText = [
            `Block length: ${blockLength}`,
            `Permutation mask: ${maskToString(mask)}`,
            `Wildcard positions: ${stats.wildcardCount}`,
            `Candidate permutations: ${stats.candidates}`,
            `Estimated output size: ${input.length * stats.candidates} characters`
        ].join("\n");

        if (showStatsOnly) return statsText;

        if (mode === "Apply single permutation") {
            return decode(input, mask, blockLength);
        }

        if (stats.candidates > maxResults) {
            throw new OperationError(`Too many candidate permutations: ${stats.candidates}. Increase Max results or reduce the number of wildcards.`);
        }

        if (isWorkerEnvironment())
            self.sendStatusMessage(`Calculating ${stats.candidates} block permutations...`);

        const output = [];
        let count = 0;

        for (const perm of generateMasks(mask, blockLength)) {
            count++;
            if (count % 10000 === 0 && isWorkerEnvironment()) {
                self.sendStatusMessage(`Calculating ${stats.candidates} block permutations... ${Math.floor(count / stats.candidates * 100)}%`);
            }

            const decoded = decode(input, perm, blockLength);
            if (crib && decoded.indexOf(crib) < 0) continue;

            output.push(`# perm: ${maskToString(perm)}\n${decoded}`);
        }

        return output.join("\n\n");
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

    const rawMask = maskStr.trim() || defaultMask(blockLength);
    const parts = rawMask.split(",").map(part => part.trim());

    if (parts.length !== blockLength) {
        throw new OperationError(`Permutation mask length (${parts.length}) must match block length (${blockLength}).`);
    }

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
 * @param {number} maxResults
 */
function validateLimits(blockLength, maxResults) {
    if (!Number.isInteger(maxResults) || maxResults < 1) {
        throw new OperationError("Max results must be a positive integer.");
    }
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
