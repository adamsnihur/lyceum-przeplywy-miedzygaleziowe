# Lyceum: Przepływy Międzygałęziowe w Makroekonomii

> Interaktywny traktat makroekonomiczny i kompendium pojęciowe wyjaśniające anatomię gospodarki narodowej, tablice Input-Output, model Wassily'ego Leontiefa (Nobel 1973) oraz mechanikę mnożników produkcji.

---

## 🏛️ Moduły Traktatu

1. **Istota i Geneza Przepływów Międzygałęziowych:** Dlaczego gospodarka nie jest pojedynczym agregatem? Ewolucja od *Tableau Économique* François Quesnaya (1758) i równowagi ogólnej Léona Walrasa (1874) do operacjonalizacji empirycznej Wassily'ego Leontiefa (Nobel 1973).
2. **Anatomia Tablicy Przepływów Międzygałęziowych (IO Table):** Cztery logiczne ćwiartki: Ćwiartka I (zużycie pośrednie B2B $Z$), Ćwiartka II (popyt końcowy $Y$), Ćwiartka III (wartość dodana brutto $V$) oraz Ćwiartka IV. Dowód tożsamości makroekonomicznej: $\sum Y_i = \sum V_j = \text{PKB}$.
3. **Formalny Model Matematyczny Leontiefa:** Hipoteza liniowości technologii (stałe nakłady bezpośrednie $A$), bilans podziału produkcji $X = AX + Y$, analityczne wyprowadzenie macierzy odwrotnej $L = (I - A)^{-1}$ oraz warunki produktywności Hawkinsa-Simona.
4. **Szereg Neumanna & Fale Mnożnikowe:** Rozwinięcie macierzy odwrotnej w szereg geometryczny $(I - A)^{-1} = I + A + A^2 + A^3 + \dots$, dekompozycja fal popytu (efekt bezpośredni vs dostawcy I, II i III rzędu).
5. **Interaktywny Sandbox Gospodarki (3 Sektory):** Symulator w czasie rzeczywistym bazujący na 3 makrosektorach (Przemysł & Energetyka, Rolnictwo & Żywność, Usługi & Technologie) z dynamiczną tablicą przepływów, suwakami popytu finalnego i odwracaniem macierzy w locie.
6. **Dynamiczny Graf Przepływów Gospodarczych (Canvas 2D):** Wizualizacja sieci powiązań międzygałęziowych z animowanymi cząstkami towarów i usług o grubości proporcjonalnej do wolumenu miliardów złotych.
7. **Powiązania w Przód i w Tył (Rasmussen & Hirschman):** Wskaźniki *Backward Linkages* (siła rozproszenia / impuls popytowy) oraz *Forward Linkages* (wrażliwość na rozproszenie / rola zaopatrzeniowa) wraz z klasyfikacją sektorów kluczowych.
8. **Symulator Szoków Makroekonomicznych:** 5 gotowych scenariuszy do testowania polityki gospodarczej (Stan Bazowy, Program CPK i Atom, Szok Cen Energii, Boom Eksportu IT, Ogólnokrajowa Recesja Popytowa).
9. **Globalne Łańcuchy Wartości (GVC) & Ekologiczne Modele EEIO:** Eliminacja podwójnego liczenia w handlu międzynarodowym (OECD TiVA, WIOD) oraz kalkulacja śladu węglowego Scope 1, 2 i 3 (CBAM).
10. **Sprawdzian Zrozumienia (Quiz PhD):** 5 pytań testujących pułapki teoretyczne z natychmiastowym feedbackiem i dynamicznym licznikiem punktów.
11. **Produkcyjna Implementacja w Pythonie:** Kompletna klasa `LeontiefInputOutputModel` w Pythonie (NumPy / Pandas) sprawdzająca warunki Hawkinsa-Simona i licząca wskaźniki Rasmussena.
12. **Bibliografia & Źródła:** Literatura klasyczna (Leontief, Miller & Blair, Hawkins & Simon) oraz standardy statystyczne (GUS, Eurostat, OECD).

---

## 🚀 Jak uruchomić

Otwórz plik bezpośrednio w dowolnej przeglądarce internetowej (brak konieczności instalacji bibliotek czy serwerów):

```bash
open "Lyceum/przeplywy-miedzygaleziowe/index.html"
```

Lub z poziomu lokalnego serwera HTTP:

```bash
cd "Lyceum/przeplywy-miedzygaleziowe"
python3 -m http.server 8000
```

---

## 🧪 Weryfikacja Dydaktyczna i Techniczna

Strona została przetestowana za pomocą automatycznego skryptu Playwright (`verify_site.py`), potwierdzając:
- 0 błędów w konsoli JavaScript (Console errors: 0),
- 0 błędów wykonawczych strony (Page errors: 0),
- Pełną reaktywność suwaków i przeliczanie tożsamości PKB w 60 FPS,
- Poprawność algorytmu sprawdzania quizu (wynik 5/5).

```bash
./.venv312/bin/python Lyceum/przeplywy-miedzygaleziowe/verify_site.py
```
