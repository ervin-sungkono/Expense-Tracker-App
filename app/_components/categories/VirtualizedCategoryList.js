'use client'
import { memo } from 'react';
import { VariableSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import CategoryCard from './CategoryCard';
import LoadingSpinner from '../common/LoadingSpinner';
import Image from 'next/image';

const Row = ({ index, style, data: { items, onCategoryClicked } }) => {
  const item = items[index];

  if(!item) return <div style={style} className='flex justify-center items-center animate-pulse'><p>Loading more data..</p></div>
  
  return (
      <CategoryCard category={item} onClick={onCategoryClicked} style={style}/>
  );
};

const MemoizedRow = memo(Row);

const VirtualizedCategoryList = ({ ref, items, onCategoryClicked }) => {
  const getItemSize = (index) => {
    const item = items[index];
    const extraLength = item.data?.length ?? 0;
    
    return 56 + extraLength * 56;
  }

  if(!items) {
    return (
      <div className='w-full h-full flex flex-col justify-center items-center gap-4 bg-neutral-200 dark:bg-neutral-700 rounded-lg px-4 py-2.5'>
        <LoadingSpinner/>
        <p className='text-dark/80 dark:text-white/80 text-sm md:text-base text-center'>Loading category data..</p>
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
          <VariableSizeList
            ref={ref}
            height={height}
            width={width}
            itemCount={items.length}
            itemSize={getItemSize}
            itemData={{ items, onCategoryClicked }}
            style={{willChange: 'initial'}}
          >
            {MemoizedRow}
          </VariableSizeList>
      )}
    </AutoSizer>
  );
};

export default VirtualizedCategoryList;