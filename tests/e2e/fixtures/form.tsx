import { useState } from "react";
import { createRoot } from "react-dom/client";

function Form() {
  const [value, setValue] = useState("");
  const [changes, setChanges] = useState(0);
  return (
    <main style={{ padding: 32, maxWidth: 640, fontFamily: "sans-serif" }}>
      <h1>ClipJect local test form</h1>
      <p>All content is synthetic. This form sends no data.</p>
      <label>
        Notes
        <textarea id="notes" rows={3} />
      </label>
      <label>
        Other field
        <input id="other" />
      </label>
      <label>
        Password
        <input id="password" type="password" />
      </label>
      <label>
        React notes
        <textarea
          id="react-notes"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setChanges((n) => n + 1);
          }}
        />
      </label>
      <output data-testid="react-state">{value}</output>
      <output data-testid="react-changes">{changes}</output>
      <label>
        Read only
        <input id="readonly" readOnly defaultValue="Protected" />
      </label>
      <label>
        Short code
        <input id="short" maxLength={5} />
      </label>
      <label>
        First item
        <input name="item-note" placeholder="First" />
      </label>
      <label>
        Second item
        <input name="item-note" placeholder="Second" />
      </label>
      <button
        onClick={() => {
          document.title = "Changed title";
        }}
      >
        Change title
      </button>
      <button
        onClick={() => {
          history.pushState(null, "", "/other");
          window.dispatchEvent(new PopStateEvent("popstate"));
        }}
      >
        Change path
      </button>
      <button onClick={() => document.querySelector("dialog")?.showModal()}>
        Open modal
      </button>
      <dialog>
        <label>
          Modal notes
          <textarea id="modal-notes" />
        </label>
        <button onClick={() => document.querySelector("dialog")?.close()}>
          Close modal
        </button>
      </dialog>
      <div style={{ height: 1200 }} />
      <p>End of form</p>
      <style>{`label { display:block; margin:12px 0 } input,textarea { display:block; width:400px; padding:8px } button { margin:4px } dialog { margin:100px auto }`}</style>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Form />);

// Browser-level helper tests exercise native editing and top-layer behavior
// that jsdom cannot implement. Main flows load the actual built extension.
import { setNativeValue } from "../../../src/lib/paste";
import { placeOverlay } from "../../../src/content/overlay-layer";
declare global {
  interface Window {
    clipjectTest: {
      setNativeValue: typeof setNativeValue;
      placeOverlay: typeof placeOverlay;
    };
  }
}
window.clipjectTest = { setNativeValue, placeOverlay };
