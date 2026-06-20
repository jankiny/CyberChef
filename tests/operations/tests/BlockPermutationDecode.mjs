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
                args: [6, ""],
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
                args: [6, "1,0,2,3,4,5"],
            },
        ],
    },
    {
        name: "Block Permutation Decode: space-separated permutation",
        input: "abcdefghijkl",
        expectedOutput: "bacdefhgijkl",
        recipeConfig: [
            {
                op: "Block Permutation Decode",
                args: [6, "1 0 2 3 4 5"],
            },
        ],
    },
    {
        name: "Block Permutation Decode: enumerate wildcards",
        input: "abcdef",
        expectedOutput: "# block length: 6\n# resolved mask: *,1,2,3,4,*\n# wildcard positions: 2\n# candidate permutations: 2\n\n# perm: 0,1,2,3,4,5\nabcdef\n\n# perm: 5,1,2,3,4,0\nfbcdea",
        recipeConfig: [
            {
                op: "Block Permutation Decode",
                args: [6, "*,1,2,3,4,*"],
            },
        ],
    },
    {
        name: "Block Permutation Decode: pads short mask with wildcards",
        input: "abcdef",
        expectedOutput: "# block length: 6\n# resolved mask: *,4,2,3,*,*\n# wildcard positions: 3\n# candidate permutations: 6\n\n# perm: 0,4,2,3,1,5\naecdbf\n\n# perm: 0,4,2,3,5,1\naecdfb\n\n# perm: 1,4,2,3,0,5\nbecdaf\n\n# perm: 1,4,2,3,5,0\nbecdfa\n\n# perm: 5,4,2,3,0,1\nfecdab\n\n# perm: 5,4,2,3,1,0\nfecdba",
        recipeConfig: [
            {
                op: "Block Permutation Decode",
                args: [6, "*,4,2,3"],
            },
        ],
    },
    {
        name: "Block Permutation Decode: long mask",
        input: "abcdef",
        expectedOutput: "Permutation mask length (7) must not exceed block length (6).",
        recipeConfig: [
            {
                op: "Block Permutation Decode",
                args: [6, "0,1,2,3,4,5,6"],
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
                args: [6, "1,1,2,3,4,5"],
            },
        ],
    },
]);
