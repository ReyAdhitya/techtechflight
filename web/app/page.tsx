import { Board } from '@/components/Board'
import { SiteHeader } from '@/components/SiteHeader'

export default function Page() {
  return (
    <>
      <a className="skip-link" href="#content">
        Skip to the Fleet
      </a>
      {/*
       * Identity and the room controls travel together in one bar above the Fleet. Both
       * describe the room rather than the Drones, which is why they sit outside the board.
       * The skip link keeps those setup controls out of the way for keyboard navigation.
       */}
      <SiteHeader />
      <Board />
    </>
  )
}
