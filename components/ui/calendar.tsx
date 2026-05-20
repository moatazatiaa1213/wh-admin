'use client'

import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import { cn } from '@/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months:               'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month:                'space-y-4',
        caption:              'flex justify-center pt-1 relative items-center',
        caption_label:        'text-sm font-semibold text-zinc-200',
        nav:                  'space-x-1 flex items-center',
        nav_button:           'h-7 w-7 bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md flex items-center justify-center transition-colors',
        nav_button_previous:  'absolute left-1',
        nav_button_next:      'absolute right-1',
        table:                'w-full border-collapse space-y-1',
        head_row:             'flex',
        head_cell:            'text-zinc-500 rounded-md w-9 font-normal text-[0.8rem] text-center',
        row:                  'flex w-full mt-2',
        cell:                 'h-9 w-9 text-center text-sm p-0 relative',
        day:                  'h-9 w-9 p-0 font-normal text-zinc-300 hover:bg-sky-500/20 hover:text-sky-300 rounded-md transition-colors flex items-center justify-center cursor-pointer',
        day_selected:         '!bg-sky-500 !text-white hover:!bg-sky-600 rounded-md',
        day_today:            'text-sky-400 font-semibold',
        day_outside:          'text-zinc-700 opacity-50',
        day_disabled:         'text-zinc-700 opacity-30 cursor-not-allowed',
        day_range_middle:     'aria-selected:bg-sky-500/20 aria-selected:text-sky-300',
        day_hidden:           'invisible',
        ...classNames,
      }}
      {...props}
    />
  )
}

Calendar.displayName = 'Calendar'
export { Calendar }
