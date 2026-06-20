/**
 * Block Permutation Decode tests.
 *
 * @author OpenAI
 *
 * @copyright Crown Copyright 2026
 * @license Apache-2.0
 */
import TestRegister from "../../lib/TestRegister.mjs";

TestRegister.addTests([
    {
        name: "Block Permutation Decode: default mask from empty value",
        input: "abcdef",
        expectedOutput: "abcdef",
        recipeConfig: [
            {
                op: "Block Permutation Decode",
                args: [6, "", "Apply single permutation", "", 10000, false],
            },
        ],
    },
    {
        name: "Block Permutation Decode: single permutation",
        input: "abcdefghijkl",
        expectedOutput: "bacdefhgijkl",
        recipeConfig: [
            {
                op: "Block Permutation Decode",
                args: [6, "1,0,2,3,4,5", "Apply single permutation", "", 10000, false],
            },
        ],
    },
    {
        name: "Block Permutation Decode: enumerate wildcards",
        input: "abcdef",
        expectedOutput: "# perm: 0,1,2,3,4,5\nabcdef\n\n# perm: 5,1,2,3,4,0\nfbcdea",
        recipeConfig: [
            {
                op: "Block Permutation Decode",
                args: [6, "*,1,2,3,4,*", "Enumerate wildcard permutations", "", 10000, false],
            },
        ],
    },
    {
        name: "Block Permutation Decode: crib filter",
        input: "abcdef",
        expectedOutput: "# perm: 5,1,2,3,4,0\nfbcdea",
        recipeConfig: [
            {
                op: "Block Permutation Decode",
                args: [6, "*,1,2,3,4,*", "Enumerate wildcard permutations", "fbc", 10000, false],
            },
        ],
    },
    {
        name: "Block Permutation Decode: show stats only",
        input: "abcdef",
        expectedOutput: "Block length: 6\nPermutation mask: *,1,2,3,4,*\nWildcard positions: 2\nCandidate permutations: 2\nEstimated output size: 12 characters",
        recipeConfig: [
            {
                op: "Block Permutation Decode",
                args: [6, "*,1,2,3,4,*", "Enumerate wildcard permutations", "", 10000, true],
            },
        ],
    },
    {
        name: "Block Permutation Decode: wildcard requires enumerate mode",
        input: "abcdef",
        expectedOutput: "The permutation mask contains wildcards. Use 'Enumerate wildcard permutations' mode or provide a complete permutation.",
        recipeConfig: [
            {
                op: "Block Permutation Decode",
                args: [6, "*,1,2,3,4,*", "Apply single permutation", "", 10000, false],
            },
        ],
    },
    {
        name: "Block Permutation Decode: repeated index",
        input: "abcdef",
        expectedOutput: "Permutation index 1 is repeated.",
        recipeConfig: [
            {
                op: "Block Permutation Decode",
                args: [6, "1,1,2,3,4,5", "Apply single permutation", "", 10000, false],
            },
        ],
    },
]);
