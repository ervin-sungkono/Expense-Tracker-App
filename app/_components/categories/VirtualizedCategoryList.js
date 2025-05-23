'use client'
import { memo } from 'react';
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import CategoryCard from './CategoryCard';
import LoadingSpinner from '../common/LoadingSpinner';
import Image from 'next/image';

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
      <div className='w-full h-full flex flex-col justify-center items-center gap-4 bg-neutral-200 dark:bg-neutral-700 rounded-lg px-4 py-2.5'>
        <LoadingSpinner/>
        <p className='text-dark/80 dark:text-white/80 text-sm md:text-base text-center'>Loading expense data..</p>
      </div>
    )
  }
  if(items.length === 0) {
    return(
      <div className='w-full h-full flex flex-col justify-center items-center text-center gap-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg px-4 py-2.5'>
        <div className='relative w-full aspect-[16/10]'>
          <Image fill src={'/not-found.png'} alt='' className='object-contain opacity-60 saturate-0'/>
        </div>
        <p className='text-dark/80 dark:text-white/80 text-sm md:text-base'>No category found..</p>
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