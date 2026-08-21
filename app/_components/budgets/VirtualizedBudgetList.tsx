'use client'
import { memo } from 'react';
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import LoadingSpinner from '../common/LoadingSpinner';
import Image from 'next/image';
import InfiniteLoader from 'react-window-infinite-loader';
import BudgetCard from './BudgetCard';

const Row = ({ index, style, data: { items } }) => {
  const item = items[index];

  if(!item) return <div style={style} className='flex justify-center items-center animate-pulse'><p>Loading more data..</p></div>
  
  return (
      <BudgetCard budget={item} style={style}/>
  );
};

const MemoizedRow = memo(Row);

const VirtualizedCategoryList = ({ scrollRef, items, hasNextPage, loadMore }) => {
    const isItemLoaded = index => !hasNextPage || index < items.length;

    if(!items) {
        return (
        <div className='w-full h-full flex flex-col justify-center items-center gap-4 rounded-lg px-4 py-2.5'>
            <LoadingSpinner/>
            <p className='text-dark/80 dark:text-white/80 text-sm md:text-base text-center'>Loading budget data..</p>
        </div>
        )
    }
    if(items.length === 0) {
        return(
        <div className='w-full h-full flex flex-col justify-center items-center text-center gap-2 rounded-lg px-4 py-2.5'>
            <div className='relative w-full aspect-[16/10]'>
            <Image fill src={'/not-found.png'} alt='' className='object-contain opacity-60 saturate-0'/>
            </div>
            <p className='text-dark/80 dark:text-white/80 text-sm md:text-base'>No budget found..</p>
        </div>
        )
    }
    return (
        <AutoSizer>
            {({ height, width }) => (
                <InfiniteLoader
                    itemCount={hasNextPage ? items.length + 1 : items.length}
                    loadMoreItems={loadMore}
                    isItemLoaded={isItemLoaded}
                >
                    {({ onItemsRendered, ref }) => (  
                        <FixedSizeList
                            ref={(ele) => {
                                ref(ele);
                                if(scrollRef) scrollRef.current = ele;
                            }}
                            onItemsRendered={onItemsRendered}
                            height={height}
                            width={width}
                            itemCount={items.length}
                            itemSize={152}
                            itemData={{ items }}
                            style={{willChange: 'initial'}}
                        >
                            {MemoizedRow}
                        </FixedSizeList>
                    )}
                </InfiniteLoader>
            )}
        </AutoSizer>
    );
};

export default VirtualizedCategoryList;