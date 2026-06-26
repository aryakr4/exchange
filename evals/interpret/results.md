# Interpret eval results

_Generated 2026-06-26T22:09:02.505Z · model `claude-haiku-4-5` · 19/20 cases_

**Overall accuracy: 95.0%**

| Category | Passed | Accuracy |
|---|---|---|
| ambiguous | 2/2 | 100.0% |
| direct | 4/4 | 100.0% |
| direction | 3/3 | 100.0% |
| multilingual | 2/3 | 66.7% |
| no_number | 3/3 | 100.0% |
| remittance | 5/5 | 100.0% |

## Per-case

| | Category | Case | Input | Model output |
|---|---|---|---|---|
| ✅ | direct | `direct-usd-eur-above` | Tell me when USD to EUR goes above 0.95 | USD→EUR greater_than 0.95 |
| ✅ | direct | `direct-gbp-usd-below` | Email me if GBP/USD drops below 1.20 | GBP→USD less_than 1.2 |
| ✅ | direct | `direct-eur-jpy-symbol` | alert when 1 EUR ≥ 170 JPY | EUR→JPY greater_than 170 |
| ✅ | direct | `direct-usd-inr-at-least` | Notify me when a dollar is worth at least 85 rupees | USD→INR greater_than 85 |
| ✅ | remittance | `remit-usd-mxn-stronger` | I send money to my mom in Mexico. Let me know when the dollar gets stronger so she gets more pesos. | USD→MXN greater_than auto |
| ✅ | remittance | `remit-usd-php-target` | I wire dollars to my family in the Philippines — ping me when one dollar gets me 60 pesos or more | USD→PHP greater_than 60 |
| ✅ | remittance | `remit-usd-ngn-better` | Want to send the most naira possible back home to Nigeria — tell me when it's a good time | USD→NGN greater_than auto |
| ✅ | remittance | `remit-gbp-inr-family` | I'm in London sending pounds to my parents in India, alert me when the rate is better for them | GBP→INR greater_than auto |
| ✅ | remittance | `remit-usd-vnd-cheaper` | let me know when it's cheaper to send money from the US to Vietnam | USD→VND greater_than auto |
| ✅ | no_number | `nonum-usd-eur-better` | let me know when it's a better time to change dollars to euros | USD→EUR greater_than auto |
| ✅ | no_number | `nonum-cad-usd-more` | tell me when my Canadian dollars buy more US dollars | CAD→USD greater_than auto |
| ✅ | no_number | `nonum-usd-krw-watch` | keep an eye on dollars to Korean won for me and say when it's good | USD→KRW greater_than auto · clarify: "What rate counts as "good" for you? For example, do you want me to alert you when 1 USD gets you at least 1,200 KRW, or is there a different target you have in mind?" |
| ✅ | direction | `dir-eur-usd-weaker` | I hold euros and want to buy dollars — alert me when the euro is strong against the dollar | EUR→USD greater_than auto |
| ✅ | direction | `dir-usd-jpy-falls` | warn me if the yen gets expensive, I pay suppliers in Japan in dollars | USD→JPY less_than auto |
| ✅ | direction | `dir-aud-nzd-explicit` | Convert Australian to New Zealand dollars, notify under 1.05 | AUD→NZD less_than 1.05 |
| ✅ | multilingual | `ml-es-usd-mxn` | avísame cuando el dólar suba frente al peso mexicano | USD→MXN greater_than auto |
| ✅ | multilingual | `ml-fr-eur-usd` | préviens-moi quand 1 euro vaut plus de 1,10 dollar | EUR→USD greater_than 1.1 |
| ❌ | multilingual | `ml-pt-brl-usd` | me avise quando o real estiver mais forte que o dólar | USD→BRL less_than auto |
| ✅ | ambiguous | `amb-unsupported-currency` | tell me when the dollar is strong against the Argentine peso | USD→AED greater_than auto · clarify: "Argentine peso (ARS) is not in our supported currency list. We support AED and other major currencies. Would you like an alert for USD to AED, or did you mean a different currency?" |
| ✅ | ambiguous | `amb-no-currencies` | let me know when it's a good time to exchange money | USD→EUR greater_than auto · clarify: "Could you tell me which currency you're exchanging FROM and which currency you're exchanging TO? Also, do you have a target rate in mind, or are you looking for any improvement (like a better rate than today)?" |
