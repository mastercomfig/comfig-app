import { ReactCompareSlider, ReactCompareSliderImage, ReactCompareSliderHandle } from 'react-compare-slider';

export default function ImageSlider({ srcOne, altOne, srcTwo, altTwo }) {
  return (
    <ReactCompareSlider
      handle={<ReactCompareSliderHandle buttonStyle={{ backdropFilter: 'blur(2px)', backgroundColor: 'rgba(50, 50, 50, 0.8)', color: '#000', opacity: 0.8, boxShadow: '0 0 5px #000' }} linesStyle={{ opacity: 0.5, color: '#212121' }} />}
      itemOne={<ReactCompareSliderImage src={srcOne} loading="lazy" alt={altOne} />}
      itemTwo={<ReactCompareSliderImage src={srcTwo} loading="lazy" alt={altTwo} />}
    />
  )
}