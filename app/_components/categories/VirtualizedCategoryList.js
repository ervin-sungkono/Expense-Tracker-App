'use client'
import { memo } from 'react';
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import CategoryCard from './CategoryCard';

const Row = ({ index, style, data }) => {
  const item = data[index];

  if(!item) return <div style={style} className='flex justify-center items-center animate-pulse'><p>Loading more data..</p></div>
  
  return (
      <CategoryCard category={item} style={style}/>
  );
};

const MemoizedRow = memo(Row);

const VirtualizedCategoryList = ({ items }) => {
  if(!items) {
    return (
      <div className='w-full h-full px-4 py-2.5 flex justify-center items-center text-center'>
        {/* TODO: add illustration loading here */}
        <p className='text-dark/80 dark:text-white/80 text-sm md:text-base'>Loading expense data..</p>
      </div>
    )
  }
  if(items.length === 0) {
    return(
      <div className='w-full h-full px-4 py-2.5 flex justify-center items-center text-center'>
        {/* TODO: add illustration not found here */}
        <p className='text-dark/80 dark:text-white/80 text-sm md:text-base'>No expense found..</p>
      </div>
    )
  }
  return (
    <AutoSizer>
      {({ height, width }) => (
          <FixedSizeList
            height={height}
            width={width}
            itemCount={items.length}
            itemSize={64}
            itemData={items}
            style={{willChange: 'initial'}}
          >
            {MemoizedRow}
          </FixedSizeList>
      )}
    </AutoSizer>
  );
};

export default VirtualizedCategoryList;