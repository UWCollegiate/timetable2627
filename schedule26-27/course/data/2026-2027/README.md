Edit the `grade9.csv`, `grade10.csv`, `grade11.csv`, `grade12.csv`, and `dualcredit.csv` files directly.

Each row is one course, and each slot column works like this:

- `N`: course is not offered in that slot
- any other value: course is offered in that slot, and the cell value is the instructor initials that should display if that slot is chosen

If a course has multiple teachers in the same slot, separate them with `/`, like `CM/DE`.

- `1` to `5`: Monday/Wednesday/Friday blocks
- `6` to `9`: Tuesday/Thursday blocks

Current slot map:

- `1`: MWF 8:30-9:40
- `2`: MWF 9:50-11:00
- `3`: MWF 11:40-12:50
- `4`: MWF 1:00-2:10
- `5`: MWF 2:20-3:30
- `6`: T/Th 8:30-10:15
- `7`: T/Th 10:30-12:15
- `8`: T/Th 1:00-2:45
- `9`: T/Th 2:55-4:40
