import { useMemo, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import type { ExpandedState } from '@tanstack/react-table'
import { GridStyles, RowsFrame } from '../../stories/GridStyles'
import { sampleItems } from '../../stories/mockOrders'
import { useDemoTable } from '../../stories/useDemoTable'
import { GridCell } from '../cells/GridCell'
import { emptySelection, groupCheckState, setScope, type SelectionState } from '../core/selection'
import { DataRow } from './DataRow'
import { GroupRow } from './GroupRow'

interface GroupRowDemoProps {
  groupBy: Array<string>
  /** Group paths to expand, e.g. `status:OPEN`. */
  initialExpanded?: Array<string>
  /** Group paths to select. */
  initialSelected?: Array<string>
  onSelect?: (groupPath: string, value: boolean) => void
}

const columns = ['order_id', 'customer_name', 'status', 'region', 'order_value']

/** Group rows from the mock server; checkboxes and expanders are live. */
function GroupRowDemo({ groupBy, initialExpanded = [], initialSelected = [], onSelect }: GroupRowDemoProps) {
  const [expanded, setExpanded] = useState<Array<string>>(initialExpanded)
  const [selection, setSelection] = useState<SelectionState>(() => initialSelected.reduce((s, groupPath) => setScope(s, { groupPath }, true), emptySelection))
  const items = useMemo(() => sampleItems({ group_by: groupBy, expanded_groups: expanded, limit: 12 }), [groupBy, expanded])
  const expandedState = useMemo<ExpandedState>(() => Object.fromEntries(expanded.map((p) => [p, true])), [expanded])
  const { table } = useDemoTable([], { items, columnIds: columns, cell: GridCell, expanded: expandedState, meta: { selection } })
  const rows = table.getRowModel().rows
  const width = table.getTotalSize()
  const navColumns = table.getVisibleLeafColumns()

  const toggle = (path: string) => setExpanded((e) => (e.includes(path) ? e.filter((p) => !p.startsWith(path)) : [...e, path]))

  return (
    <GridStyles>
      <RowsFrame rows={rows.length} width={width}>
        <div
          onClick={(e) => {
            const row = (e.target as HTMLElement).closest<HTMLElement>('.tg-group-row')
            if (row && (e.target as HTMLElement).closest('.tg-expander')) toggle(rows[Number(row.dataset.row)]!.id)
          }}
        >
          {rows.map((row, index) => {
            const item = row.original
            if (item.kind === 'GROUP') {
              const check = groupCheckState(selection, item.group_path)
              return (
                <GroupRow
                  key={row.id}
                  row={row}
                  item={item}
                  index={index}
                  top={index * 36}
                  width={width}
                  expanded={expanded.includes(item.group_path)}
                  checked={check.checked}
                  indeterminate={check.indeterminate}
                  column={table.getColumn(item.field)}
                  onSelect={(value) => {
                    setSelection((s) => setScope(s, { groupPath: item.group_path }, value))
                    onSelect?.(item.group_path, value)
                  }}
                />
              )
            }
            return (
              <DataRow
                key={row.id}
                row={row}
                index={index}
                top={index * 36}
                width={width}
                startCount={0}
                colStart={0}
                colEnd={navColumns.length - 1}
                padLeft={0}
                padRight={0}
                selected={false}
                editingColumn={null}
                editMode={false}
                sizing={table.state.columnSizing}
                columns={navColumns}
              />
            )
          })}
        </div>
      </RowsFrame>
    </GridStyles>
  )
}

const meta = {
  title: 'Grid/Body/GroupRow',
  component: GroupRowDemo,
  parameters: {
    docs: {
      description: {
        component:
          'A server-side group: checkbox (selects every record in the group, loaded or not), expander, column label, value and record count. ' +
          'Indented by depth. Click the chevron to expand.',
      },
    },
  },
  args: { groupBy: ['status'], onSelect: fn() },
} satisfies Meta<typeof GroupRowDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Collapsed: Story = {}

export const Nested: Story = {
  args: { groupBy: ['status', 'region'], initialExpanded: ['status:OPEN'] },
  parameters: { docs: { description: { story: 'Second-level groups are indented under their parent.' } } },
}

export const ExpandedWithRecords: Story = { args: { groupBy: ['status'], initialExpanded: ['status:OPEN'] } }

export const Selected: Story = { args: { initialSelected: ['status:OPEN', 'status:SHIPPED'] } }
