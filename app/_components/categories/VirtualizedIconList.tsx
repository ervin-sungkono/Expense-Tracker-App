'use client'
import { memo } from 'react';
import { FixedSizeGrid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import IconCard from './IconCard';
import LoadingSpinner from '../common/LoadingSpinner';
import Image from 'next/image';

const COLUMN_CNT = 5;

const Row = ({ columnIndex, rowIndex, style, data: { items, onIconClicked } }) => {
  const index = rowIndex * COLUMN_CNT + columnIndex;

  if(index >= items.length) return; // if the index is more than available data, it is not a valid index

  const item = items[rowIndex * COLUMN_CNT + columnIndex]; // load the item from data
  if(!item) return <div style={style} className='flex justify-center items-center animate-pulse'><p>Loading more data..</p></div>
  
  return (
      <IconCard src={item} onClick={onIconClicked} style={style}/>
  );
};

const MemoizedRow = memo(Row);

const VirtualizedIconList = ({ items, onIconClicked }) => {
  if(!items) {
    return (
      <div className='w-full h-full px-4 py-2.5 flex flex-col gap-4 justify-center items-center text-center'>
        <LoadingSpinner/>
        <p className='text-dark/80 dark:text-white/80 text-sm md:text-base'>Loading icon data..</p>
      </div>
    )
  }
  if(items.length === 0) {
    return(
      <div className='w-full h-full flex flex-col justify-center items-center text-center gap-2 rounded-lg px-4 py-2.5'>
        <div className='relative w-full aspect-[16/10]'>
          <Image fill src={'/not-found.png'} alt='' className='object-contain opacity-60 saturate-0'/>
        </div>
        <p className='text-dark/80 dark:text-white/80 text-sm md:text-base'>No icon found..</p>
      </div>
    )
  }
  return (
    <AutoSizer>
      {({ width, height }) => (
          <FixedSizeGrid
            rowHeight={64}
            rowCount={Math.ceil(items.length / COLUMN_CNT)}
            columnWidth={width / COLUMN_CNT}
            columnCount={COLUMN_CNT}
            height={height}
            width={width}
            itemData={{items, onIconClicked}}
            style={{willChange: 'initial', overflowX: 'hidden'}}
            overscanRowCount={20}
          >
            {MemoizedRow}
          </FixedSizeGrid>
      )}
    </AutoSizer>
  )
};

export default VirtualizedIconList;