import { ArrowUturnLeftIcon } from "@heroicons/react/24/outline";
import { NavLink } from "react-router-dom";
import { useStore } from "./OptionsProvider";

export default function BackBtn() {
  const { state } = useStore();

  return (
    <div className="border border-zinc-900 bg-gray-100 rounded-full transition ease-in-out hover:scale-105 hover:drop-shadow-lg w-fit h-fit">
      <NavLink to={state.page}>
        <ArrowUturnLeftIcon className=" h-6 w-6 m-2 text-zinc-900" />
      </NavLink>
    </div>
  );
}
