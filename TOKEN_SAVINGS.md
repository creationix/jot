# Token Savings Report

Measured across 18 sample files using Claude's tokenizer.

**Total: 13% token savings, 29% size reduction**

| Sample | JSON Tokens | Jot Tokens | Savings | JSON Bytes | Jot Bytes | Savings |
|--------|-------------|------------|---------|------------|-----------|---------|
| [users-50](samples/users-50.pretty.jot) | 1327 | 837 | 37% | 4355 | 2181 | 50% |
| [hikes](samples/hikes.pretty.jot) | 140 | 103 | 26% | 452 | 272 | 40% |
| [medium](samples/medium.pretty.jot) | 96 | 76 | 21% | 315 | 201 | 36% |
| [metrics](samples/metrics.pretty.jot) | 76 | 60 | 21% | 164 | 114 | 30% |
| [products](samples/products.pretty.jot) | 772 | 613 | 21% | 2568 | 1560 | 39% |
| [chat](samples/chat.pretty.jot) | 71 | 63 | 11% | 291 | 237 | 19% |
| [key-folding-with-array](samples/key-folding-with-array.pretty.jot) | 53 | 47 | 11% | 200 | 149 | 26% |
| [routes](samples/routes.pretty.jot) | 1517 | 1352 | 11% | 4508 | 3394 | 25% |
| [key-folding-basic](samples/key-folding-basic.pretty.jot) | 50 | 45 | 10% | 187 | 132 | 29% |
| [large](samples/large.pretty.jot) | 240 | 221 | 8% | 893 | 667 | 25% |
| [github-issue](samples/github-issue.pretty.jot) | 73 | 68 | 7% | 292 | 243 | 17% |
| [key-folding-mixed](samples/key-folding-mixed.pretty.jot) | 70 | 65 | 7% | 238 | 191 | 20% |
| [package](samples/package.pretty.jot) | 94 | 91 | 3% | 238 | 191 | 20% |
| [small](samples/small.pretty.jot) | 37 | 36 | 3% | 115 | 92 | 20% |
| [firewall](samples/firewall.pretty.jot) | 846 | 825 | 2% | 2957 | 2310 | 22% |
| [json-counts-cache](samples/json-counts-cache.pretty.jot) | 133 | 132 | 1% | 384 | 337 | 12% |
| [logs](samples/logs.pretty.jot) | 1751 | 1737 | 1% | 5194 | 4216 | 19% |
| [irregular](samples/irregular.pretty.jot) | 49 | 49 | 0% | 169 | 134 | 21% |
| **Total** | **7395** | **6420** | **13%** | **23520** | **16621** | **29%** |