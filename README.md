# WECA bus punctuality audit

An independent, non-commercial monitor of bus punctuality across the West of
England, built from operators' public open data and compared with the published
95% punctuality target.

**Live site:** https://bristol-bus-bot.github.io/weca-bus-audit/

## What this repository is

This is the automatically updated publication repository for the audit. Its
`docs/` directory contains the GitHub Pages site and the latest aggregated audit
data. `AUDIT_METHODOLOGY.md` describes the measurement and its limitations.

The collector, matching, rollup and export source code has one source of truth:
the [BristolBusBot repository](https://github.com/bristol-bus-bot/bristolbusbot).
The relevant code is under `collector/`, `pipeline/` and `audit-site/` there.
Keeping the implementation in one repository prevents public copies drifting
away from the code that actually produces these figures.

## What the audit measures

A collector polls public SIRI-VM feeds and matches each vehicle to a scheduled
trip. When a bus passes a timetable timing point, its lateness is recorded.
Daily rollups produce operator, route, area, ward and fleet statistics. The
complete definitions, matching rules and known limitations are in
`AUDIT_METHODOLOGY.md`.

This project does not claim that an operator is breaking the law or withholding
required data. These are independent measurements and may differ from operator
or regulator figures that use different sampling.

## Data sources and licences

- Real-time positions: Department for Transport Bus Open Data Service (BODS).
- Timetables: BODS GTFS, operator TransXChange and the Traveline National
  Dataset.
- Fleet enrichment: the bustimes.org API. Raw community vehicle records are not
  published here; the audit contains only aggregated statistics.

Contains public sector information licensed under the Open Government Licence
v3.0. The Department for Transport and its agencies accept no responsibility
for the accuracy, timeliness or completeness of the data. The website code is
licensed under AGPL-3.0-only; see `LICENSE`.

Not affiliated with, endorsed by, or funded by any bus operator, the West of
England Combined Authority, or any authority.
