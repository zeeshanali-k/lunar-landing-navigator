# How to source the 16 site coordinates

You need 16 selenographic coordinate pairs, each with a URL proving where the number came from. This guide tells you exactly what to look for, where, and what a good answer looks like.

Read the whole thing once before you start. It is about 10 minutes, and it will save you from collecting numbers that turn out to be unusable.

---

## 1. What a coordinate looks like

A lunar position is two numbers, in degrees:

```text
lat_deg:  -89.45     latitude   (negative = south)
lon_deg:  135.2      longitude  (positive = east)
```

**Two rules that catch almost every mistake:**

1. **Latitude near the south pole is negative.** Anything for a south-polar site should be between −80 and −90. If a source gives you `89.45` without a minus, it is probably a south latitude written as a magnitude.
2. **Longitude must be 0–360 or −180 to +180, and we use east-positive.** This is the trap. Many lunar sources publish **west** longitude as a positive number, because that was the older convention. East-positive and west-positive are mirror images: a site at 135°E is 225°W.

   We use **east-positive**, matching `backend/config/curated_sites.yaml` and REQ-05. If a source says "west", convert: `east = 360 − west`. If a source says "east", use it as-is.

   **How to tell which one you are looking at:** check a site whose answer you already know. Apollo 11 is about **23.47°E**. If a source shows Apollo 11 as `336.53`, that source is publishing west longitude.

---

## 2. Where to look, in order of preference

### Best: a named lunar feature

For craters and massifs (Haworth, Malapert, Nobile, Cabeus, de Gerlache, Mons Mouton), the certainty comes from the feature itself, because the IAU defines its exact centre.

**Source: the IAU/USGS Gazetteer of Planetary Nomenclature**
`https://planetarynames.wr.usgs.gov/`

Search the feature name. The feature page gives centre latitude/longitude and diameter, and that page is citable.

**Warning, measured today:** the gazetteer's *search* endpoint returns HTTP 500 intermittently. Direct feature pages (`https://planetarynames.wr.usgs.gov/Feature/<id>`) return 200. If search fails, retry later or use a search engine to find the feature's direct page. Do not guess an ID.

**What to copy:** the centre coordinate pair, plus the feature page URL.

**What this gives you:** the centre of the crater or massif. That is the right anchor for a "landing region near X" entry, and it is defensible.

### Best: NASA QuickMap

`https://quickmap.lroc.asu.edu/`

This is the tool the challenge itself recommends. It is a map with real LRO data, and it displays the cursor position in lunar coordinates.

**How to use it:**

1. Open the link. The URL supports a direct view, e.g. `?lat=-89.45&lon=135.2`.
2. Turn on a coordinate readout or use the coordinate display in the UI.
3. Pan so the feature you want is under the crosshair.
4. Read latitude and longitude off the display.
5. **Copy the URL from the address bar** — that URL, containing the lat/lon, is your provenance.

**What this gives you:** a coordinate you can defend, because a reviewer can open the same URL and see the same point.

### Acceptable: NASA Moon Trek

`https://trek.nasa.gov/moon/`

Same idea as QuickMap, different interface, and it shows topographic data. Use it if QuickMap's coordinate readout is unclear to you. URL format includes `x=` (longitude) and `y=` (latitude).

### Acceptable: a NASA mission or published paper

Some sites are defined by a specific published figure — for example "Chang'e-4 landed at 45.456°S, 177.588°E" from the mission's own papers. Cite the paper or NASA page.

---

## 3. Where NOT to look

- **Wikipedia.** Useful to find the right paper, but cite the paper, not the article.
- **Any blog, forum, or research-summary site** that gives a number without saying where it came from.
- **A map image you eyeball.** If you estimate a position from a picture, I cannot record it — REQ-05 forbids inferred coordinates.
- **Your memory, or mine.** Neither counts as a source.

If the best you can do is "somewhere in this region", that is not a coordinate. Say so and leave it blocked.

---

## 4. What to record for each site

For each of the 14, give me:

| Field | Example |
|---|---|
| `lat_deg` | `-89.45` |
| `lon_deg` | `135.2` |
| `source_url` | the exact URL where you saw the number |
| `source_kind` | `gazetteer` / `quickmap` / `moon_trek` / `paper` |
| `notes` | anything odd — e.g. "converted from west longitude" |

The `source_url` must be one a stranger can open and see the same number. That is the whole point: it is what makes our data checkable instead of trusted.

---

## 5. The 16 sites

**Polar sites — these get real terrain.** Nine of them, NASA's current Artemis III candidate
landing regions (release 24-136, 2024-10-28). The coordinates should all be between −80° and
−90° latitude.

| # | Site name | What to search for |
|---|---|---|
| 1 | Peak near Cabeus B | feature: **Cabeus B** crater |
| 2 | Haworth | feature: **Haworth** crater |
| 3 | Malapert Massif | feature: **Malapert** (also called Malapert Mountain) |
| 4 | Mons Mouton Plateau | feature: **Mons Mouton** (formerly Leibnitz Beta) |
| 5 | Mons Mouton | feature: **Mons Mouton** — same feature, different sub-region |
| 6 | Nobile Rim 1 | feature: **Nobile** crater, rim position 1 |
| 7 | Nobile Rim 2 | feature: **Nobile** crater, rim position 2 |
| 8 | de Gerlache Rim 2 | feature: **de Gerlache** crater, rim position 2 |
| 9 | Slater Plain | near **Shackleton** crater; flat plain region |

**Equatorial and mid-latitude sites — limb-only model, no terrain.** Seven of them.

| # | Site name | What to search for |
|---|---|---|
| 10 | Mare Crisium (Blue Ghost) | feature: **Mare Crisium**, near **Mons Latreille** |
| 11 | Gruithuisen Domes | feature: **Gruithuisen Domes** |
| 12 | Lacus Mortis | feature: **Lacus Mortis** |
| 13 | Apollo 11 | Tranquility Base; published as **23.473°E, 0.674°N** |
| 14 | Apollo 15 | Hadley Rille; published as about **3.63°E, 26.13°N** |
| 15 | Chandrayaan-3 (Shiv Shakti Point) | published as about **69.37°S, 32.35°E** |
| 16 | Chang'e-4 (Von Kármán) | published as about **45.46°S, 177.59°E** |

For rows 1–5 there is a real ambiguity I want you to notice rather than resolve alone: **"Mons Mouton Plateau" and "Mons Mouton" are two separate NASA Artemis III regions on the same massif.** The gazetteer gives one centre for the massif. If you cannot find two distinct published positions, tell me and we will either keep one entry or mark the second as sharing the massif coordinate. Do not invent a second pair to fill the table.

Same for Nobile Rim 1 and de Gerlache Rim 2 — the gazetteer gives the crater centre, not the rim sub-region.

---

## 6. What to expect while doing this

Honest expectations, so nothing surprises you:

- **Some will be easy.** Apollo 11, Apollo 15, Chang'e-4, Chandrayaan-3 are published everywhere. Ten minutes.
- **The polar ones will be harder.** NASA publishes Artemis III regions as *maps with outlined areas*, not as single coordinates, because a region is 15 km across and contains many candidate sites. So "the coordinate" for a region is a choice, not a fact.
- **The gazetteer may keep failing.** It returned HTTP 500 four times in a row today. If it stays down, QuickMap is the fallback and is arguably better for these sites, because you can see the region outline.
- **Some entries may stay unresolved.** If a region has no published centre and you cannot pin it on QuickMap with confidence, leave it blank and tell me. A registry of 14 verified sites is worth more than 16 where two are guesses — and the plan can be revised to match reality.

---

## 7. How to hand it back to me

Paste this filled in, and I will validate it before writing anything:

```yaml
- id: artemis-haworth
  name: Haworth
  lat_deg: -87.5
  lon_deg: -4.0
  source_url: https://planetarynames.wr.usgs.gov/Feature/...
  source_kind: gazetteer
  notes: ""
```

I will then check each one for: range, sign, east-positive convention, and whether the URL actually shows that number. If something looks wrong I will tell you rather than quietly fixing it — a coordinate I silently "correct" is worse than one you flagged as uncertain.

---

## 8. The one thing to remember

If you are unsure whether a number is right, **write down where you got it and flag it**. That is the difference between a source we can check and a number we are trusting. The recorded URL is the actual deliverable here; the coordinate is downstream of it.
