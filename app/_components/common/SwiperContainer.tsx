import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Virtual } from 'swiper/modules'

import 'swiper/css'

export default function SwiperContainer({ spaceBetween = 0, slidesPerView = 1, items = [] }) {
    if(items.length === 0) return
    return(
        <Swiper
            spaceBetween={spaceBetween}
            slidesPerView={slidesPerView}
            freeMode={true}
            modules={[FreeMode, Virtual]}
            breakpoints={{
                640: {
                    slidesPerView: slidesPerView * 1.2,
                    spaceBetween: spaceBetween * 1.5
                }
            }}
            className="swiper"
            style={{ overflow: 'visible' }}
            virtual={{
                enabled: true,
                addSlidesBefore: 5,
                addSlidesAfter: 5
            }}
        >
            {items.map(item => (
                <SwiperSlide key={item.id}>{item.component}</SwiperSlide>
            ))}
        </Swiper>
    )
}